"""VISION-PHM: Layer 1 - Conditioning & Zero-Leakage Gate.

Implements train-only KMeans regime clustering (k=6 for FD002/FD004),
per-regime z-score normalization, and causal trailing feature windows (5/10/30).
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import KMeans

from config import KEEP_SENSORS, REGIME_CLUSTERS, COLS, CAP_RUL


class RegimeNormalizer:
    """Zero-leakage regime normalizer fitting only on train splits."""

    def __init__(self, n_regimes: int = 1, random_state: int = 0):
        self.n_regimes = n_regimes
        self.random_state = random_state
        self.kmeans: Optional[KMeans] = None
        self.means: Dict[int, Dict[str, float]] = {}
        self.stds: Dict[int, Dict[str, float]] = {}
        self.global_mean: Dict[str, float] = {}
        self.global_std: Dict[str, float] = {}

    def fit(self, df_train: pd.DataFrame) -> "RegimeNormalizer":
        df = df_train.copy()
        if self.n_regimes > 1:
            self.kmeans = KMeans(
                n_clusters=self.n_regimes, n_init=10, random_state=self.random_state
            ).fit(df[["op1", "op2", "op3"]])
            df["reg"] = self.kmeans.labels_

            for reg in range(self.n_regimes):
                reg_mask = df["reg"] == reg
                reg_df = df[reg_mask]
                self.means[reg] = {}
                self.stds[reg] = {}
                for s in KEEP_SENSORS:
                    if len(reg_df) > 0:
                        m = float(reg_df[s].mean())
                        sd = float(reg_df[s].std())
                        sd = sd if sd > 1e-6 else 1.0
                    else:
                        m = float(df[s].mean())
                        sd = float(df[s].std()) or 1.0
                    self.means[reg][s] = m
                    self.stds[reg][s] = sd
        else:
            self.kmeans = None

        # Global stats as baseline / fallback
        for s in KEEP_SENSORS:
            self.global_mean[s] = float(df[s].mean())
            sd = float(df[s].std())
            self.global_std[s] = sd if sd > 1e-6 else 1.0

        return self

    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df_out = df.copy()
        if self.kmeans is not None and self.n_regimes > 1:
            regs = self.kmeans.predict(df_out[["op1", "op2", "op3"]])
            df_out["reg"] = regs
            for s in KEEP_SENSORS:
                # Vectorized map of regime means and stds
                m_vec = np.array([self.means[r][s] for r in regs])
                s_vec = np.array([self.stds[r][s] for r in regs])
                df_out[s] = (df_out[s].to_numpy() - m_vec) / s_vec
        else:
            for s in KEEP_SENSORS:
                m = self.global_mean[s]
                sd = self.global_std[s]
                df_out[s] = (df_out[s] - m) / sd
        return df_out

    def transform_single(self, op_settings: List[float], sensor_values: Dict[str, float]) -> Dict[str, float]:
        """Normalize a single point observation."""
        if self.kmeans is not None and self.n_regimes > 1:
            reg = int(self.kmeans.predict(np.array(op_settings).reshape(1, -1))[0])
            normed = {}
            for s, val in sensor_values.items():
                if s in KEEP_SENSORS:
                    m = self.means[reg][s]
                    sd = self.stds[reg][s]
                    normed[s] = (val - m) / sd
                else:
                    normed[s] = val
            return normed
        else:
            normed = {}
            for s, val in sensor_values.items():
                if s in KEEP_SENSORS:
                    m = self.global_mean[s]
                    sd = self.global_std[s]
                    normed[s] = (val - m) / sd
                else:
                    normed[s] = val
            return normed


def compute_causal_features(df_unit: pd.DataFrame) -> pd.DataFrame:
    """Causal rolling feature generator with strict zero look-ahead."""
    features = {}
    for s in KEEP_SENSORS:
        series = df_unit[s]
        m5 = series.rolling(5, min_periods=1).mean()
        m30 = series.rolling(30, min_periods=1).mean()
        sd10 = series.rolling(10, min_periods=2).std().fillna(0.0)

        features[s] = series.values
        features[f"{s}_m5"] = m5.values
        features[f"{s}_delta"] = (m5 - m30).values
        # Also alias _d to match legacy/validation model feature naming if needed
        features[f"{s}_d"] = (m5 - m30).values
        features[f"{s}_sd"] = sd10.values

    features["cycle"] = df_unit["cycle"].values
    return pd.DataFrame(features, index=df_unit.index)


def compute_causal_features_fleet(df_all: pd.DataFrame) -> pd.DataFrame:
    """Computes causal features partitioned per engine unit."""
    all_units = []
    for unit, g in df_all.groupby("unit", sort=False):
        f = compute_causal_features(g)
        f["unit"] = unit
        all_units.append(f)
    result = pd.concat(all_units, axis=0)
    return result

