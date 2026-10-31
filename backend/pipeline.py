"""VISION-PHM: End-to-End Pipeline & Artifact Builder.

Trains the prognostic models across C-MAPSS subsets (FD001, FD002, FD003, FD004),
generates 5-fold GroupKFold OOF predictions, calibrates Mondrian conformal tables,
fits Ledoit-Wolf trust envelopes, and precomputes held-out trajectories.
"""

import os
import pickle
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor
from sklearn.model_selection import GroupKFold

from config import (
    CMAPSS_DIR, ARTIFACTS_DIR, COLS, KEEP_SENSORS, CAP_RUL,
    REGIME_CLUSTERS, LEAD_TIME, PERSISTENCE_CYCLES
)
from conditioning import RegimeNormalizer, compute_causal_features
from conformal import calibrate_mondrian, predict_dual_bounds
from decision import evaluate_trigger_policy, find_optimal_threshold
from trust import TrustSafetyEnvelope


def load_subset_raw(subset: str, data_dir: Path = CMAPSS_DIR) -> Tuple[pd.DataFrame, pd.DataFrame, np.ndarray]:
    """Loads raw C-MAPSS train, test, and RUL truth data for a subset (e.g. 'FD001')."""
    subset_num = subset.replace("FD00", "")
    train_path = data_dir / f"train_FD00{subset_num}.txt"
    test_path = data_dir / f"test_FD00{subset_num}.txt"
    rul_path = data_dir / f"RUL_FD00{subset_num}.txt"

    if not train_path.exists():
        raise FileNotFoundError(f"Missing train data file: {train_path}")

    tr = pd.read_csv(train_path, sep=r"\s+", header=None, names=COLS)
    te = pd.read_csv(test_path, sep=r"\s+", header=None, names=COLS)
    rul = pd.read_csv(rul_path, header=None)[0].values

    # Compute ground truth RUL for training trajectories
    max_cycle = tr.groupby("unit")["cycle"].transform("max")
    tr["rul"] = max_cycle - tr["cycle"]

    return tr, te, rul


def extract_features(df: pd.DataFrame) -> Tuple[pd.DataFrame, List[str]]:
    """Generates the 57-dimensional causal feature matrix."""
    feature_dfs = []
    for unit, g in df.groupby("unit", sort=False):
        f = compute_causal_features(g)
        feature_dfs.append(f)
    result = pd.concat(feature_dfs, axis=0)

    # 57 feature column names (14 sensors * 4 + cycle)
    feat_cols = []
    for s in KEEP_SENSORS:
        feat_cols.extend([s, f"{s}_m5", f"{s}_delta", f"{s}_sd"])
    feat_cols.append("cycle")

    return result[feat_cols], feat_cols


def train_subset(
    subset: str,
    data_dir: Path = CMAPSS_DIR
) -> Dict[str, Any]:
    """Fits all pipeline layers for a subset."""
    print(f"[{subset}] Loading data...")
    tr, te, rul_test = load_subset_raw(subset, data_dir)
    n_reg = REGIME_CLUSTERS.get(subset, 1)

    # 1. Conditioning & Normalization
    print(f"[{subset}] Fitting RegimeNormalizer (n_regimes={n_reg})...")
    normalizer = RegimeNormalizer(n_regimes=n_reg, random_state=0)
    normalizer.fit(tr)
    tr_norm = normalizer.transform(tr)
    te_norm = normalizer.transform(te)

    # 2. Causal Feature Extraction (57-dim)
    print(f"[{subset}] Extracting 57-dim causal features...")
    X_tr, feat_cols = extract_features(tr_norm)
    X_te, _ = extract_features(te_norm)
    y_tr = np.minimum(tr["rul"].values, CAP_RUL)

    # 3. Fit Main Prognostic Model
    print(f"[{subset}] Training HistGradientBoostingRegressor...")
    model = HistGradientBoostingRegressor(
        max_iter=300,
        learning_rate=0.06,
        max_leaf_nodes=31,
        min_samples_leaf=40,
        l2_regularization=1.0,
        random_state=0
    )
    model.fit(X_tr, y_tr)

    # Test set evaluation (last row of each test engine)
    idx_last = te.groupby("unit").tail(1).index.values
    p_test = np.clip(model.predict(X_te.loc[idx_last]), 0, CAP_RUL)
    y_test_true = np.minimum(rul_test, CAP_RUL)
    rmse_test = float(np.sqrt(np.mean((p_test - y_test_true) ** 2)))
    print(f"[{subset}] Test RMSE: {rmse_test:.2f}")

    # 4. GroupKFold (k=5) Out-Of-Fold for Conformal Calibration
    print(f"[{subset}] Computing 5-Fold GroupKFold OOF predictions...")
    units = tr["unit"].values
    oof_preds = np.zeros(len(tr))
    oof_folds = np.zeros(len(tr), dtype=int)

    gkf = GroupKFold(n_splits=5)
    for k, (train_idx, val_idx) in enumerate(gkf.split(X_tr, y_tr, units)):
        fold_model = HistGradientBoostingRegressor(
            max_iter=300,
            learning_rate=0.06,
            max_leaf_nodes=31,
            min_samples_leaf=40,
            l2_regularization=1.0,
            random_state=0
        )
        fold_model.fit(X_tr.iloc[train_idx], y_tr[train_idx])
        oof_preds[val_idx] = np.clip(fold_model.predict(X_tr.iloc[val_idx]), 0, CAP_RUL)
        oof_folds[val_idx] = k

    # 5. Mondrian Conformal Calibration
    print(f"[{subset}] Calibrating Mondrian Conformal bounds (90% and 95%)...")
    calib_90 = calibrate_mondrian(oof_preds, y_tr, alpha=0.10)
    calib_95 = calibrate_mondrian(oof_preds, y_tr, alpha=0.05)

    # Compute trajectory bounds for decision evaluation
    lb90_oof = np.zeros(len(tr))
    lb95_oof = np.zeros(len(tr))
    for i in range(len(tr)):
        _, lb90, lb95 = predict_dual_bounds(oof_preds[i], calib_90, calib_95)
        lb90_oof[i] = lb90
        lb95_oof[i] = lb95

    df_trajectories = pd.DataFrame({
        "unit": units,
        "cycle": tr["cycle"].values,
        "p": oof_preds,
        "lb": lb90_oof,
        "lb90": lb90_oof,
        "lb95": lb95_oof,
        "true_rul": y_tr
    })

    # 6. Fit Trust Envelope (Ledoit-Wolf OOD Detector)
    print(f"[{subset}] Fitting Ledoit-Wolf Trust Envelope...")
    # Sample up to 10,000 points if training set is huge for fast covariance estimation
    if len(X_tr) > 10000:
        sample_indices = np.random.default_rng(0).choice(len(X_tr), 10000, replace=False)
        trust_features = X_tr.iloc[sample_indices].to_numpy()
    else:
        trust_features = X_tr.to_numpy()

    trust_envelope = TrustSafetyEnvelope(trust_features, q_threshold=99.0)

    # 7. Evaluate Baseline Policy
    opt_policy = find_optimal_threshold(
        df_trajectories, target_failure_rate=0.05, controlled=True
    )
    print(f"[{subset}] Optimal Controlled Threshold: {opt_policy['optimal_threshold']} "
          f"(Mean Waste: {opt_policy['mean_wasted_cycles']:.1f} cycles)")

    bundle = {
        "subset": subset,
        "model": model,
        "normalizer": normalizer,
        "feat_cols": feat_cols,
        "calib_90": calib_90,
        "calib_95": calib_95,
        "trust_envelope": trust_envelope,
        "test_rmse": rmse_test,
        "optimal_policy": opt_policy,
        "trajectories": df_trajectories,
        "test_raw": te,
        "test_true": y_test_true
    }

    return bundle


def save_bundle(bundle: Dict[str, Any], out_dir: Path = ARTIFACTS_DIR) -> None:
    """Saves pipeline bundle to disk."""
    subset = bundle["subset"]
    dest = out_dir / f"bundle_{subset}.pkl"
    with open(dest, "wb") as f:
        pickle.dump(bundle, f)
    print(f"Bundle saved to {dest}")


def load_bundle(subset: str, in_dir: Path = ARTIFACTS_DIR) -> Dict[str, Any]:
    """Loads pre-trained pipeline bundle from disk."""
    src = in_dir / f"bundle_{subset}.pkl"
    if not src.exists():
        raise FileNotFoundError(f"Bundle not found: {src}")
    with open(src, "rb") as f:
        bundle = pickle.load(f)
    return bundle

