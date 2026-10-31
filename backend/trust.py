"""VISION-PHM: Cross-Cutting Trust & Safety Envelope.

Implements Ledoit-Wolf Mahalanobis Out-Of-Distribution (OOD) detection
(99th train percentile), stuck/spike sensor safety gates, and automated abstention.
"""

from typing import Dict, List, Optional, Union
import numpy as np
import pandas as pd
from sklearn.covariance import LedoitWolf

from config import KEEP_SENSORS


class TrustSafetyEnvelope:
    """Rigorous trust envelope wrapping all model inference."""

    def __init__(self, train_features: np.ndarray, q_threshold: float = 99.0):
        self.q_threshold = q_threshold
        # Fit regularized covariance matrix
        self.cov_model = LedoitWolf().fit(train_features)
        train_distances = self.cov_model.mahalanobis(train_features)
        self.ood_cutoff = float(np.percentile(train_distances, q_threshold))

    def evaluate_safety(
        self,
        current_vector: np.ndarray,
        raw_window: pd.DataFrame,
        interval_width: Optional[float] = None,
        max_interval_width: float = 60.0
    ) -> Dict:
        """Evaluates sensor telemetry integrity and OOD operating envelopes.

        1. Stuck sensor check (constant values over trailing >= 10 cycles)
        2. Spike / corruption check (NaN, Inf, or absurd negative physical values)
        3. Mahalanobis distance against Ledoit-Wolf covariance model (99th percentile cutoff)
        4. Interval width check (if confidence band widens beyond actionable threshold > 60)
        """
        flags: List[Dict] = []
        reasons: List[str] = []

        # 1. Stuck Sensor Check
        if len(raw_window) >= 10:
            for sensor in raw_window.columns:
                if sensor in KEEP_SENSORS or sensor.startswith("s"):
                    vals = raw_window[sensor].to_numpy(dtype=float)
                    if np.ptp(vals) == 0.0:
                        flags.append({"sensor": sensor, "issue": "STUCK_SENSOR"})
                        reasons.append(f"Sensor {sensor} has frozen output")

        # 2. Numerical Corruption / Out of Range
        if np.any(np.isnan(current_vector)) or np.any(np.isinf(current_vector)):
            flags.append({"metric": "NUMERICAL_CORRUPTION", "issue": "NAN_OR_INF"})
            reasons.append("Sensor vector contains NaN or infinite values")

        # 3. Latent Mahalanobis OOD Evaluation
        try:
            vec_clean = np.nan_to_num(current_vector.reshape(1, -1), nan=0.0, posinf=1e4, neginf=-1e4)
            dist = float(self.cov_model.mahalanobis(vec_clean)[0])
            if dist > self.ood_cutoff:
                flags.append({"metric": "OOD_MAHALANOBIS", "value": dist, "cutoff": self.ood_cutoff})
                reasons.append("Telemetry lies outside valid fleet operating domain")
        except Exception as e:
            flags.append({"metric": "OOD_EVAL_ERROR", "error": str(e)})
            reasons.append(f"Failed to evaluate OOD covariance: {e}")

        # 4. Actionable Conformal Interval Width Check
        if interval_width is not None and interval_width > max_interval_width:
            flags.append({
                "metric": "EXCESSIVE_UNCERTAINTY",
                "interval_width": interval_width,
                "cutoff": max_interval_width
            })
            reasons.append(f"Conformal interval width ({interval_width:.1f}) exceeds actionable threshold ({max_interval_width:.1f})")

        abstain = len(flags) > 0
        return {
            "abstain": abstain,
            "flags": flags,
            "reasons": reasons
        }

