"""Trust & safety envelope: OOD (Mahalanobis), sensor-fault checks, abstention."""
import numpy as np
from .config import KEEP

class OODDetector:
    def fit(self, Z, q=0.995):
        self.mu = Z.mean(0); cov = np.cov(Z, rowvar=False) + 1e-6 * np.eye(Z.shape[1])
        self.P = np.linalg.pinv(cov)
        self.thr = float(np.quantile(self.score(Z), q)); return self
    def score(self, Z):
        d = np.atleast_2d(Z) - self.mu; return np.sqrt(np.einsum("ij,jk,ik->i", d, self.P, d))
    def is_ood(self, z): return bool(self.score(z)[0] > self.thr * 1.5)

def sensor_faults(raw_window, norm_window, z_limit=8.0):
    """raw_window/norm_window: (n, 14). Flags: stuck (10 identical raw values), range (|z|>limit), spike (jump>6 sd of window)."""
    flags = []
    if len(raw_window) >= 10:
        stuck = np.nonzero(np.ptp(raw_window[-10:], axis=0) == 0)[0]
        flags += [f"stuck:{KEEP[j]}" for j in stuck]
    last = norm_window[-1]
    flags += [f"range:{KEEP[j]}" for j in np.nonzero(np.abs(last) > z_limit)[0]]
    if len(norm_window) >= 6:
        sd = norm_window[:-1].std(0) + 1e-9; jump = np.abs(norm_window[-1] - norm_window[-2])
        flags += [f"spike:{KEEP[j]}" for j in np.nonzero(jump > 6 * sd + 1.0)[0]]
    return flags

