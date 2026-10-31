"""VISION-PHM: Layer 2 - Physics-Aware Health Index.

Implements monotonic degradation projection, thermodynamic gas-path
deltas (T30/T24, Ps30/P30), and per-sensor attribution.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


def compute_gas_path_deltas(sensor_dict: Dict[str, float]) -> Dict[str, float]:
    """Computes key thermodynamic gas-path ratios and deltas.

    - T24 (LPC outlet total temperature): s2
    - T30 (HPC outlet total temperature): s3
    - Ps30 (HPC outlet static pressure): s7
    - P30 (HPC outlet total pressure): s8
    """
    t24 = sensor_dict.get("s2", np.nan)
    t30 = sensor_dict.get("s3", np.nan)
    ps30 = sensor_dict.get("s7", np.nan)
    p30 = sensor_dict.get("s8", np.nan)

    t_ratio = (t30 / t24) if (t24 and not np.isnan(t24) and t24 != 0) else np.nan
    p_ratio = (ps30 / p30) if (p30 and not np.isnan(p30) and p30 != 0) else np.nan

    return {
        "T30_T24_ratio": float(t_ratio) if not np.isnan(t_ratio) else 1.0,
        "Ps30_P30_ratio": float(p_ratio) if not np.isnan(p_ratio) else 1.0,
        "T30_T24_delta": float(t30 - t24) if not (np.isnan(t30) or np.isnan(t24)) else 0.0,
        "Ps30_P30_delta": float(ps30 - p30) if not (np.isnan(ps30) or np.isnan(p30)) else 0.0,
    }


def compute_health_index(
    rul_predicted: float,
    cap_rul: float = 125.0,
    historical_hi: Optional[List[float]] = None
) -> float:
    """Projects predicted RUL onto a monotonic health index in [0.0, 1.0].

    1.0 = pristine newly commissioned turbofan
    0.0 = functional failure boundary / maintenance threshold reached
    """
    raw_hi = float(np.clip(rul_predicted / cap_rul, 0.0, 1.0))
    if historical_hi and len(historical_hi) > 0:
        # Enforce strict physical monotonic non-increasing degradation
        monotonic_hi = min(raw_hi, min(historical_hi))
        return float(monotonic_hi)
    return raw_hi


def compute_sensor_attribution(
    sensor_features: Dict[str, float],
    reference_means: Dict[str, float],
    reference_stds: Dict[str, float],
    feature_importances: Optional[Dict[str, float]] = None
) -> Dict[str, float]:
    """Computes per-sensor attribution to system degradation.

    Measures normalized absolute z-deviation from baseline, weighted by model importance.
    """
    attributions = {}
    total_score = 0.0

    for s, val in sensor_features.items():
        if s in reference_means and s in reference_stds:
            mu = reference_means[s]
            sd = reference_stds[s] or 1.0
            z_score = abs(val - mu) / sd
            weight = feature_importances.get(s, 1.0) if feature_importances else 1.0
            score = z_score * weight
            attributions[s] = score
            total_score += score

    # Normalize to percentage attribution
    if total_score > 1e-6:
        attributions = {s: round((score / total_score) * 100.0, 2) for s, score in attributions.items()}
    else:
        n = len(attributions) or 1
        attributions = {s: round(100.0 / n, 2) for s in attributions}

    return attributions

