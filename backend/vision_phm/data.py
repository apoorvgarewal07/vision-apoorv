"""L0/L1: loading, regime-aware conditioning, causal features."""
import numpy as np, pandas as pd
from sklearn.cluster import KMeans
from .config import COLS, KEEP, DATA_DIR, WINDOW

def load(n, data_dir=DATA_DIR):
    d = str(data_dir).rstrip("/") + "/"
    tr = pd.read_csv(d + f"train_FD00{n}.txt", sep=r"\s+", header=None, names=COLS)
    te = pd.read_csv(d + f"test_FD00{n}.txt", sep=r"\s+", header=None, names=COLS)
    rul = pd.read_csv(d + f"RUL_FD00{n}.txt", header=None)[0].values
    tr["rul"] = tr.groupby("unit")["cycle"].transform("max") - tr["cycle"]
    return tr, te, rul

class Normalizer:
    """Per-regime z-score. Fit on TRAIN engines only (leakage-safe)."""
    def __init__(self, n_reg):
        self.n_reg = n_reg; self.km = None; self.mu = None; self.sd = None

    def fit(self, tr):
        if self.n_reg > 1:
            self.km = KMeans(n_clusters=self.n_reg, n_init=10, random_state=0).fit(tr[["op1", "op2", "op3"]].values)
        reg = self._reg(tr); X = tr[KEEP].values
        self.mu = np.zeros((self.n_reg, len(KEEP))); self.sd = np.ones((self.n_reg, len(KEEP)))
        for r in range(self.n_reg):
            m = reg == r
            if m.sum() < 2: continue
            self.mu[r] = X[m].mean(0)
            sd = X[m].std(0, ddof=1)
            self.sd[r] = np.where(sd == 0, 1.0, sd)
        return self

    def _reg(self, df):
        if self.n_reg == 1 or self.km is None: return np.zeros(len(df), dtype=int)
        return self.km.predict(df[["op1", "op2", "op3"]].values)

    def transform(self, df):
        out = df.copy(); reg = self._reg(df)
        out[KEEP] = (df[KEEP].values - self.mu[reg]) / self.sd[reg]
        out["reg"] = reg
        return out

def feature_names():
    names = []
    for s in KEEP: names += [s, s + "_m5", s + "_d", s + "_sd"]
    return names + ["cycle"]

def feats(df):
    """Batch causal features (df normalised, sorted by unit, cycle). Mirrors cmapss_validation.py."""
    g = df.groupby("unit"); F = {}
    for s in KEEP:
        m5 = g[s].transform(lambda v: v.rolling(5, min_periods=1).mean())
        m30 = g[s].transform(lambda v: v.rolling(30, min_periods=1).mean())
        sd = g[s].transform(lambda v: v.rolling(10, min_periods=2).std()).fillna(0)
        F[s] = df[s].values; F[s + "_m5"] = m5.values; F[s + "_d"] = (m5 - m30).values; F[s + "_sd"] = sd.values
    F["cycle"] = df["cycle"].values
    return pd.DataFrame(F)[feature_names()]

def feats_last(norm_window, cycle):
    """O(WINDOW) streaming features for the newest cycle. norm_window: (n<=WINDOW, 14) normalised, oldest first."""
    w = np.asarray(norm_window)[-WINDOW:]; n = len(w); out = []
    for j in range(len(KEEP)):
        v = w[:, j]; m5 = v[-5:].mean(); m30 = v.mean()
        sd = v[-10:].std(ddof=1) if len(v[-10:]) >= 2 else 0.0
        out += [v[-1], m5, m5 - m30, 0.0 if np.isnan(sd) else sd]
    out.append(cycle)
    return np.asarray(out, dtype=float)

def last_rows(te):
    return te.groupby("unit").tail(1).index.values

