"""L5: risk-controlled trigger selection (Clopper-Pearson), policy simulator, optimal stopping."""
import numpy as np, pandas as pd
from scipy.stats import beta, norm
from .config import LEAD, RISK_EPS, RISK_CONF

POLICIES = ("fixed", "point", "lower", "lower_persist3")
THR_GRID = list(range(0, 126, 3))

def cp_upper(k, n, conf=RISK_CONF):
    return 1.0 if k >= n else float(beta.ppf(conf, k + 1, n - k))

def persist_ok(ok, k):
    return np.convolve(ok.astype(int), np.ones(k, dtype=int), "full")[:len(ok)] >= k

def unit_outcome(cyc, p, lb, Tu, pol, thr, lead=LEAD):
    """Returns (failed, unused_cycles). Removal = first trigger cycle + lead; failure if removal >= end-of-life."""
    if pol == "fixed":
        return (1, np.nan) if Tu <= thr else (0, Tu - thr)
    ok = (p <= thr) if pol == "point" else (lb <= thr)
    if pol == "lower_persist3": ok = persist_ok(ok, 3)
    hit = np.nonzero(ok)[0]
    if len(hit) == 0: return 1, np.nan
    t_exec = cyc[hit[0]] + lead
    return (1, np.nan) if t_exec >= Tu else (0, Tu - t_exec)

def build_matrices(df, lead=LEAD):
    """df columns: unit, cycle, p (OOF pred), lb (cross-calibrated LB). Returns FAIL/WASTE/GRID dicts."""
    T = df.groupby("unit")["cycle"].max(); units = list(T.index)
    per = {u: (g["cycle"].values, g["p"].values, g["lb"].values) for u, g in df.groupby("unit")}
    c_grid = list(range(40, int(T.max()) + 1, 4)); FAIL, WASTE, GRID = {}, {}, {}
    for pol in POLICIES:
        grid = c_grid if pol == "fixed" else THR_GRID; GRID[pol] = grid
        FAIL[pol] = np.zeros((len(grid), len(units))); WASTE[pol] = np.full((len(grid), len(units)), np.nan)
        for gi, th in enumerate(grid):
            for ei, u in enumerate(units):
                c, p, lb = per[u]; f, w = unit_outcome(c, p, lb, T[u], pol, th, lead)
                FAIL[pol][gi, ei] = f; WASTE[pol][gi, ei] = w
    return FAIL, WASTE, GRID, units, T

def choose(FAIL, WASTE, GRID, pol, idx, eps=RISK_EPS, controlled=True, conf=RISK_CONF):
    best, bw = None, np.inf
    for gi in range(len(GRID[pol])):
        k = FAIL[pol][gi, idx].sum(); n = len(idx)
        ok = (cp_upper(int(k), n, conf) <= eps) if controlled else (k / n <= eps)
        if not ok or not (FAIL[pol][gi, idx] == 0).any(): continue
        w = np.nanmean(WASTE[pol][gi, idx])
        if w < bw: bw, best = w, gi
    return best

def select_thresholds(df, eps=RISK_EPS, conf=RISK_CONF):
    FAIL, WASTE, GRID, units, T = build_matrices(df); idx = np.arange(len(units)); out = {}
    for pol in POLICIES:
        gi = choose(FAIL, WASTE, GRID, pol, idx, eps, True, conf)
        if gi is None: out[pol] = None; continue
        k = int(FAIL[pol][gi].sum())
        out[pol] = {"theta": GRID[pol][gi], "fail_rate": k / len(units), "cp_upper": cp_upper(k, len(units), conf),
                    "mean_unused": float(np.nanmean(WASTE[pol][gi]))}
    return out

def heldout_validation(df, eps=RISK_EPS, reps=200, seed=7):
    """Select on a random half, evaluate on the other half; naive vs risk-controlled (Section 7.4)."""
    FAIL, WASTE, GRID, units, T = build_matrices(df); NE = len(units); rr = np.random.default_rng(seed); res = {}
    for pol in POLICIES:
        for mode in ("naive", "controlled"):
            fr, viol, feas = [], 0, 0
            for _ in range(reps):
                perm = rr.permutation(NE); a, b = perm[:NE // 2], perm[NE // 2:]
                gi = choose(FAIL, WASTE, GRID, pol, a, eps, mode == "controlled")
                if gi is None: continue
                feas += 1; f = FAIL[pol][gi, b].mean(); fr.append(f); viol += int(f > eps)
            res[f"{pol}|{mode}"] = {"feasible_frac": feas / reps, "mean_fail_rate": float(np.mean(fr)) if fr else None,
                                     "viol_frac": viol / max(feas, 1)}
    return res

def optimal_removal_cycle(mu, sigma, cycle_now, cost_ratio=1e-3, horizon=125):
    """Newsvendor/age-replacement rule: act when predictive hazard f(s)/(1-F(s)) >= c_w/C_f.
    RUL ~ N(mu, sigma) at the current cycle. Returns cycles from now until recommended removal (0 = now)."""
    s = np.arange(0, horizon + 1); z = (s - mu) / max(sigma, 1e-6)
    h = norm.pdf(z) / (sigma * np.clip(norm.sf(z), 1e-12, None))
    idx = np.nonzero(h >= cost_ratio)[0]
    return int(s[idx[0]]) if len(idx) else None

