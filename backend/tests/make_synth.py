"""Synthetic C-MAPSS-format files for smoke tests only (NOT real data)."""
import numpy as np, pandas as pd
from pathlib import Path

def make(d, n=1, n_eng=40, seed=0):
    r = np.random.default_rng(seed); d = Path(d); d.mkdir(parents=True, exist_ok=True)
    nreg = 6 if n in (2, 4) else 1; centers = r.uniform(0, 1, (nreg, 3)) * [42, .84, 100]
    def eng(u, life):
        reg = r.integers(0, nreg, life); op = centers[reg] + r.normal(0, .001, (life, 3))
        deg = (np.arange(life) / life) ** 2
        S = np.zeros((life, 21))
        for j in range(21): S[:, j] = 100 + 10 * j + reg * (j % 3) * 3 + (j % 4 - 1.5) * 8 * deg + r.normal(0, 1, life)
        return pd.DataFrame(np.column_stack([np.full(life, u), np.arange(1, life + 1), op, S]))
    tr = pd.concat([eng(u, int(r.integers(150, 260))) for u in range(1, n_eng + 1)])
    tes, ruls = [], []
    for u in range(1, n_eng + 1):
        life = int(r.integers(150, 260)); cut = int(r.integers(60, life - 5)); e = eng(u, life).iloc[:cut]; tes.append(e)
        ruls.append(life - cut)
    te = pd.concat(tes)
    tr.to_csv(d / f"train_FD00{n}.txt", sep=" ", header=False, index=False)
    te.to_csv(d / f"test_FD00{n}.txt", sep=" ", header=False, index=False)
    pd.Series(ruls).to_csv(d / f"RUL_FD00{n}.txt", header=False, index=False)

