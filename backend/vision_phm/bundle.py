import hashlib, json, joblib
from dataclasses import dataclass, field
from pathlib import Path

@dataclass
class Bundle:
    subset: int
    normalizer: object
    model: object
    calibrator: object
    ood: object
    thresholds: dict
    metrics: dict = field(default_factory=dict)
    version: str = "1.0.0"

def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""): h.update(ch)
    return h.hexdigest()

def save(bundle, art_dir):
    art = Path(art_dir); art.mkdir(parents=True, exist_ok=True)
    p = art / f"bundle_fd00{bundle.subset}.joblib"; joblib.dump(bundle, p)
    (art / f"manifest_fd00{bundle.subset}.json").write_text(json.dumps({"file": p.name, "sha256": sha256(p), "version": bundle.version}, indent=2))
    (art / f"metrics_fd00{bundle.subset}.json").write_text(json.dumps(bundle.metrics, indent=2, default=float))
    return p

def load(subset, art_dir):
    art = Path(art_dir); p = art / f"bundle_fd00{subset}.joblib"
    man = json.loads((art / f"manifest_fd00{subset}.json").read_text())
    if sha256(p) != man["sha256"]: raise RuntimeError("artifact hash mismatch: refusing to load")
    return joblib.load(p)

