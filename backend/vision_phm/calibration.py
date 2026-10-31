"""L4: Mondrian split-conformal (predicted-RUL buckets), engine-grouped OOF calibration."""
import numpy as np
from .config import EDGES, ALPHAS

def bucket(p): return np.digitize(p, EDGES)

def q_fin(v, a):
    n = len(v)
    if n == 0: return 0.0
    k = min(n, int(np.ceil((n + 1) * (1 - a))))
    return float(np.sort(v)[k - 1])

def calib_q(p_cal, y_cal, a, kind, min_n=30):
    b = bucket(p_cal)
    resid = (p_cal - y_cal) if kind == "lb" else np.abs(p_cal - y_cal)
    g = q_fin(resid, a); out = {}
    for k in range(len(EDGES) + 1):
        m = b == k
        out[k] = q_fin(resid[m], a) if m.sum() >= min_n else g
    return out

class Calibrator:
    def __init__(self, alphas=ALPHAS): self.alphas = alphas; self.t = {}
    def fit(self, oof, y):
        for a in self.alphas:
            self.t[("abs", a)] = calib_q(oof, y, a, "abs"); self.t[("lb", a)] = calib_q(oof, y, a, "lb")
        return self
    def _q(self, kind, a, p):
        tab = self.t[(kind, a)]; return np.array([tab[k] for k in np.atleast_1d(bucket(p))])
    def interval(self, p, a=0.1):
        q = self._q("abs", a, p); p = np.atleast_1d(p); return p - q, p + q
    def lower(self, p, a=0.1): return np.atleast_1d(p) - self._q("lb", a, p)
    def width(self, p, a=0.1): return 2 * self._q("abs", a, p)

def cross_lower_bounds(oof, y, fold, a=0.1, k=5):
    """Fold-wise cross-calibrated lower bounds so simulation never calibrates on the engine it scores."""
    lbs = np.zeros(len(oof))
    for f in range(k):
        cal, m = fold != f, fold == f
        tab = calib_q(oof[cal], y[cal], a, "lb")
        lbs[m] = oof[m] - np.array([tab[j] for j in bucket(oof[m])])
    return lbs

