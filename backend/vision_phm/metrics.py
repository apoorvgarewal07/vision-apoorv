import numpy as np

def rmse(d): return float(np.sqrt(np.mean(np.asarray(d) ** 2)))

def nasa_score(d):
    d = np.asarray(d)
    return float(np.sum(np.where(d < 0, np.exp(-d / 13) - 1, np.exp(d / 10) - 1)))

def boot_ci(d, B=2000, seed=0):
    r = np.random.default_rng(seed); d = np.asarray(d); n = len(d)
    v = [rmse(d[r.integers(0, n, n)]) for _ in range(B)]
    return [float(np.percentile(v, 2.5)), float(np.percentile(v, 97.5))]

