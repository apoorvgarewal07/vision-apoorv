"""VISION-PHM: Layer 4 - Mondrian Split-Conformal Calibration Engine.

Provides exact finite-sample one-sided lower bounds guaranteeing
P(True RUL >= LB) >= 1 - alpha under Mondrian partitioning.
"""

from typing import Dict, List, Tuple, Union, Optional
import numpy as np
from config import CONFORMAL_EDGES, CAP_RUL

EDGES = CONFORMAL_EDGES  # [15, 30, 50, 75, 100, 115]


def get_bucket(pred_rul: Union[float, np.ndarray, List[float]]) -> np.ndarray:
    """Partitions predicted RUL into Mondrian regime buckets."""
    return np.digitize(np.asarray(pred_rul, dtype=float), EDGES)


def finite_sample_quantile(v: np.ndarray, alpha: float) -> float:
    """Computes exact finite-sample conformal quantile:

    k = ceil((n + 1) * (1 - alpha))
    quantile = sorted[k - 1]
    """
    n = len(v)
    if n == 0:
        return 0.0
    k = min(n, int(np.ceil((n + 1) * (1 - alpha))))
    return float(np.sort(v)[k - 1])


def calibrate_mondrian(
    p_oof: np.ndarray,
    y_true: np.ndarray,
    alpha: float = 0.10,
    min_bucket_samples: int = 30
) -> Dict:
    """Calibrates Mondrian split-conformal table from out-of-fold predictions.

    Uses one-sided lower bound residuals: r = p_oof - y_true.
    """
    residuals = np.asarray(p_oof, dtype=float) - np.asarray(y_true, dtype=float)
    global_q = finite_sample_quantile(residuals, alpha)
    buckets = get_bucket(p_oof)

    table = {
        "alpha": alpha,
        "target_coverage": 1.0 - alpha,
        "global": float(global_q),
        "buckets": {}
    }

    for b in range(len(EDGES) + 1):
        mask = (buckets == b)
        n_samples = int(np.sum(mask))
        if n_samples >= min_bucket_samples:
            q_val = finite_sample_quantile(residuals[mask], alpha)
            table["buckets"][str(b)] = float(q_val)
        else:
            table["buckets"][str(b)] = float(global_q)

    return table


def predict_lower_bound(
    p_pred: float,
    calib_table: Dict
) -> Tuple[float, float]:
    """Calculates point prediction and conformal lower bound:

    LB = max(0.0, p_pred - q)
    """
    p = float(np.clip(p_pred, 0, CAP_RUL))
    b = str(np.digitize(p, EDGES))
    q = calib_table.get("buckets", {}).get(b, calib_table.get("global", 0.0))
    lb = max(0.0, p - q)
    return p, float(lb)


def predict_dual_bounds(
    p_pred: float,
    calib_table_90: Dict,
    calib_table_95: Dict
) -> Tuple[float, float, float]:
    """Returns point prediction, 90% lower bound, and 95% lower bound."""
    p, lb90 = predict_lower_bound(p_pred, calib_table_90)
    _, lb95 = predict_lower_bound(p_pred, calib_table_95)
    return p, lb90, lb95

