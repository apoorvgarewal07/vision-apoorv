import os
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent.resolve()
DATA_DIR = Path(os.environ.get("CMAPSS_DIR", BASE_DIR / "cmapss"))
ART_DIR = Path(os.environ.get("ARTIFACT_DIR", BASE_DIR / "artifacts"))
SUBSET = int(os.environ.get("SUBSET", "1"))

COLS = ["unit", "cycle", "op1", "op2", "op3"] + [f"s{i}" for i in range(1, 22)]
KEEP = [f"s{i}" for i in (2, 3, 4, 7, 8, 9, 11, 12, 13, 14, 15, 17, 20, 21)]
N_REGIMES = {1: 1, 2: 6, 3: 1, 4: 6}

CAP = 125  # RUL cap (sweep 100-140 in ablation)
WINDOW = 30  # longest causal window; per-engine state is O(WINDOW)
LEAD = 15  # logistics lead time (cycles) between trigger and removal
EDGES = [15, 30, 50, 75, 100, 115]  # predicted-RUL buckets for Mondrian conformal
ALPHAS = (0.2, 0.1, 0.05)
SERVE_ALPHA = 0.10
RISK_EPS = 0.05  # in-service failure target
RISK_CONF = 0.90  # Clopper-Pearson confidence
PERSIST = 3  # k-of-n persistence for the serving trigger
MAX_INTERVAL_WIDTH = float(os.environ.get("MAX_INTERVAL_WIDTH", "70"))  # abstain above this
LLP_CYCLES = int(os.environ["LLP_CYCLES"]) if os.environ.get("LLP_CYCLES") else None  # hard-life guard

