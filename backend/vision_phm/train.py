"""Training pipeline: normaliser -> features -> GBM -> 5-fold engine-grouped OOF -> conformal -> thresholds -> OOD -> bundle.
Usage: python -m vision_phm.train --subset 1 (needs NASA C-MAPSS txt files in CMAPSS_DIR)"""
import argparse, json, time
import numpy as np, pandas as pd
from sklearn.model_selection import GroupKFold
from . import config as C, bundle as B
from .data import load, Normalizer, feats, last_rows
from .models import make_gbm, predict_clipped
from .calibration import Calibrator, cross_lower_bounds, bucket
from .metrics import rmse, nasa_score, boot_ci
from .risk import select_thresholds, heldout_validation
from .trust import OODDetector

def run(subset, data_dir=C.DATA_DIR, art_dir=C.ART_DIR, validate=True, seed=0):
    t0 = time.time(); tr, te, rul = load(subset, data_dir)
    norm = Normalizer(C.N_REGIMES[subset]).fit(tr)
    trn, ten = norm.transform(tr), norm.transform(te)
    Xtr, Xte = feats(trn), feats(ten); y = np.minimum(tr["rul"].values, C.CAP).astype(float)
    model = make_gbm(seed).fit(Xtr, y)
    
    # --- official test evaluation (last window per engine) ---
    idx = last_rows(ten); p = predict_clipped(model, Xte.loc[idx]); ytrue = np.minimum(rul, C.CAP); d = p - ytrue
    m = {"subset": subset, "n_train_engines": int(tr.unit.nunique()), "n_test_engines": int(len(idx)),
         "rmse": rmse(d), "rmse_ci": boot_ci(d), "nasa": nasa_score(d)}
    
    # --- engine-grouped OOF predictions (calibration + decision simulation) ---
    units = tr["unit"].values; oof = np.zeros(len(tr)); fold = np.zeros(len(tr), dtype=int)
    for k, (a, b) in enumerate(GroupKFold(5).split(Xtr, y, units)):
        oof[b] = predict_clipped(make_gbm(seed).fit(Xtr.iloc[a], y[a]), Xtr.iloc[b]); fold[b] = k
    m["oof_rmse"] = rmse(oof - y)
    
    cal = Calibrator().fit(oof, y)
    m["coverage"] = {}
    for a in C.ALPHAS:
        lo, hi = cal.interval(p, a)
        m["coverage"][str(a)] = {"nominal": 1 - a, "empirical": float(((ytrue >= lo) & (ytrue <= hi)).mean()),
                                 "mean_width": float((hi - lo).mean())}
    m["lower_bound_safe_frac"] = float((ytrue >= cal.lower(p, C.SERVE_ALPHA)).mean())
    
    # --- risk-controlled thresholds on cross-calibrated OOF lower bounds ---
    lbs = cross_lower_bounds(oof, y, fold, C.SERVE_ALPHA)
    df = pd.DataFrame({"unit": units, "cycle": tr["cycle"].values, "p": oof, "lb": lbs})
    thr = select_thresholds(df); m["thresholds"] = thr
    if validate: m["heldout_validation"] = heldout_validation(df)
    
    # --- OOD detector on normalised early+late sensor vectors ---
    from .config import KEEP
    ood = OODDetector().fit(trn[KEEP].values)
    
    bun = B.Bundle(subset=subset, normalizer=norm, model=model, calibrator=cal, ood=ood, thresholds=thr, metrics=m)
    path = B.save(bun, art_dir); m["train_seconds"] = round(time.time() - t0, 1)
    print(json.dumps({k: v for k, v in m.items() if k != "heldout_validation"}, indent=1, default=float)); print("saved", path)
    return bun

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--subset", type=int, default=C.SUBSET)
    ap.add_argument("--no-validate", action="store_true"); a = ap.parse_args()
    run(a.subset, validate=not a.no_validate)

