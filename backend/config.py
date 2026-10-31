"""VISION-PHM: Configuration, System Constants & Feature Specifications."""

import os
from pathlib import Path

# Directories
WORKSPACE_DIR = Path(__file__).parent.resolve()
CMAPSS_DIR = Path(os.environ.get("CMAPSS_DIR", WORKSPACE_DIR / "cmapss"))
ARTIFACTS_DIR = WORKSPACE_DIR / "artifacts"
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

# Dataset columns
COLS = ["unit", "cycle", "op1", "op2", "op3"] + [f"s{i}" for i in range(1, 22)]

# The 14 informative C-MAPSS channels (non-informative constant sensors s1, s5, s6, s10, s16, s18, s19 stripped)
KEEP_SENSORS = [
    "s2", "s3", "s4", "s7", "s8", "s9", "s11", "s12", "s13", "s14", "s15", "s17", "s20", "s21"
]

# Non-informative constant sensors
STRIPPED_SENSORS = ["s1", "s5", "s6", "s10", "s16", "s18", "s19"]

# Operational constraints
CAP_RUL = 125
LEAD_TIME = 15
PERSISTENCE_CYCLES = 3
TARGET_FAILURE_RATE = 0.05
CONFIDENCE_ALPHA_90 = 0.10
CONFIDENCE_ALPHA_95 = 0.05

# Clustering per subset
REGIME_CLUSTERS = {
    "FD001": 1,
    "FD002": 6,
    "FD003": 1,
    "FD004": 6
}

# Conformal partition edges
CONFORMAL_EDGES = [15, 30, 50, 75, 100, 115]

