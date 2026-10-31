import numpy as np, pandas as pd, tempfile
from vision_phm import config as C
from vision_phm.data import load, Normalizer, feats, feats_last, feature_names
from vision_phm.calibration import Calibrator
from vision_phm.risk import cp_upper
from tests.make_synth import make

def _setup():
    d = tempfile.mkdtemp(); make(d, 1); tr, te, rul = load(1, d)
    nz = Normalizer(1).fit(tr); return tr, te, nz

def test_causality():
    tr, te, nz = _setup(); df = nz.transform(tr[tr.unit == 1]).reset_index(drop=True)
    F1 = feats(df); df2 = df.copy(); df2.loc[100:, C.KEEP] += 50; F2 = feats(df2)
    assert np.allclose(F1.iloc[:100].values, F2.iloc[:100].values) # future cycles cannot change the past

def test_streaming_equals_batch():
    tr, te, nz = _setup(); df = nz.transform(tr[tr.unit == 2]).reset_index(drop=True); F = feats(df)
    for t in (0, 1, 7, 29, 60, len(df) - 1):
        w = df[C.KEEP].values[max(0, t - C.WINDOW + 1): t + 1]
        assert np.allclose(feats_last(w, int(df.cycle[t])), F.iloc[t].values, atol=1e-9)

def test_conformal_marginal_coverage():
    r = np.random.default_rng(0); y = r.uniform(0, 125, 20000); p = y + r.normal(0, 10, 20000)
    cal = Calibrator().fit(p[:10000], y[:10000]); lo, hi = cal.interval(p[10000:], 0.1)
    cov = ((y[10000:] >= lo) & (y[10000:] <= hi)).mean(); assert 0.88 < cov < 0.93

def test_cp_bound():
    assert cp_upper(0, 100, 0.9) > 0 and cp_upper(5, 100, 0.9) > 0.05 and cp_upper(100, 100) == 1.0

