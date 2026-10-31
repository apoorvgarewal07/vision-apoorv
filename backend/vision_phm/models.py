"""L3: prognostic experts. GBM is the validated expert; TCN is an optional torch expert (Tier 2, not validated)."""
import numpy as np
from sklearn.ensemble import HistGradientBoostingRegressor
from .config import CAP

def make_gbm(seed=0):
    return HistGradientBoostingRegressor(max_iter=300, learning_rate=0.06, max_leaf_nodes=31,
                                         min_samples_leaf=40, l2_regularization=1.0, random_state=seed)

def predict_clipped(model, X):
    return np.clip(model.predict(X), 0, CAP)

def build_tcn(n_feat, ch=64, blocks=4, k=3, drop=0.2):
    try:
        import torch.nn as nn, torch.nn.functional as F
        class Block(nn.Module):
            def __init__(s, cin, cout, d):
                super().__init__(); s.pad = (k - 1) * d
                s.c1 = nn.Conv1d(cin, cout, k, dilation=d); s.c2 = nn.Conv1d(cout, cout, k, dilation=d)
                s.act = nn.ReLU(); s.dp = nn.Dropout(drop)
                s.res = nn.Conv1d(cin, cout, 1) if cin != cout else nn.Identity()
            def forward(s, x):
                y = s.dp(s.act(s.c1(F.pad(x, (s.pad, 0)))))
                y = s.dp(s.act(s.c2(F.pad(y, (s.pad, 0)))))
                return s.act(y + s.res(x))
        class TCN(nn.Module):
            def __init__(s):
                super().__init__()
                s.net = nn.Sequential(*[Block(n_feat if i == 0 else ch, ch, 2 ** i) for i in range(blocks)])
                s.head = nn.Linear(ch, 1)
            def forward(s, x):
                return s.head(s.net(x.transpose(1, 2))[:, :, -1]).squeeze(-1)
        return TCN()
    except Exception:
        return None

def asym_huber(pred, y, delta=10.0, lam=0.01):
    """Huber + extra penalty on late warnings (d = pred - y > 0)."""
    import torch
    d = pred - y; a = d.abs()
    hub = torch.where(a <= delta, 0.5 * d ** 2, delta * (a - 0.5 * delta))
    return (hub + lam * torch.clamp(d, min=0) ** 2).mean()

