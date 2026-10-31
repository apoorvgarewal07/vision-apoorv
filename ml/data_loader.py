"""
NASA C-MAPSS Turbofan Degradation Ingestion & Schema Verification Module
------------------------------------------------------------------------

SCIENTIFIC INTEGRITY & SENSOR COVERAGE NOTE:
The NASA C-MAPSS (Commercial Modular Aero-Propulsion System Simulation) benchmark
models synthetic run-to-failure degradation of large commercial turbofan jet engines.
The telemetry streams consist strictly of gas-path thermodynamic measurements:
static/total pressures, temperatures, spool rotational speeds (fan N1, core N2),
fuel-air flow ratios, and compressor/turbine bleed extraction parameters.

CRITICAL DISTINCTION:
C-MAPSS does NOT contain vibration accelerometer channels, acoustic emission data,
lubricating oil pressure transducers, or oil debris particle counts. Any claim of
vibration analysis on C-MAPSS is scientifically unfounded. PHM prognostics on this
dataset are purely aerothermal and rotational speed-based.

ZERO DATA LEAKAGE:
Ground-truth end-of-flight test RUL arrays are kept strictly isolated and must NEVER
be merged or joined into `test_df` during loading, feature generation, or inference.
"""

from pathlib import Path
from typing import Tuple, Union
import numpy as np
import pandas as pd

# Complete standard C-MAPSS 26-column schema
COLS = ["unit", "cycle", "op1", "op2", "op3"] + [f"s{i}" for i in range(1, 22)]

# Informative sensor subset excluding unvarying/constant channels
SENSORS_KEEP = [
    "s2", "s3", "s4", "s7", "s8", "s9", "s11",
    "s12", "s13", "s14", "s15", "s17", "s20", "s21"
]

# Physical aerospace nomenclature mapping
SENSOR_NAMES = {
    "s2": "T24 - LPC Outlet Temp (°R)",
    "s3": "T30 - HPC Outlet Temp (°R)",
    "s4": "T50 - LPT Outlet Temp (°R)",
    "s7": "P30 - HPC Outlet Pressure (psia)",
    "s8": "Nf - Physical Fan Speed (rpm)",
    "s9": "Nc - Physical Core Speed (rpm)",
    "s11": "Ps30 - Static HPC Outlet Pressure (psia)",
    "s12": "phi - Fuel Flow Ratio to Ps30 (pps/psi)",
    "s13": "NRf - Corrected Fan Speed (rpm)",
    "s14": "NRc - Corrected Core Speed (rpm)",
    "s15": "BPR - Bypass Ratio",
    "s17": "htBleed - Bleed Enthalpy",
    "s20": "W31 - HPT Coolant Bleed (lbm/s)",
    "s21": "W32 - LPT Coolant Bleed (lbm/s)",
}

# Expected unit counts per subset (train units, test units)
EXPECTED_ENGINE_COUNTS = {
    "FD001": {"train_units": 100, "test_units": 100},
    "FD002": {"train_units": 260, "test_units": 259},
    "FD003": {"train_units": 100, "test_units": 100},
    "FD004": {"train_units": (248, 249), "test_units": (248, 249)},
}


def _resolve_data_dir(data_dir: Union[str, Path]) -> Path:
    """Resolve data_dir relative to current working dir or workspace root."""
    path = Path(data_dir)
    if path.is_dir():
        return path

    # Check relative to repo root
    workspace_root = Path(__file__).resolve().parent.parent
    candidate = workspace_root / data_dir
    if candidate.is_dir():
        return candidate

    # Fallback to backend/cmapss if raw directory hasn't been populated yet
    backend_cmapss = workspace_root / "backend" / "cmapss"
    if backend_cmapss.is_dir():
        return backend_cmapss

    return path


def load_subset(
    subset_name: str,
    data_dir: str = "data/raw"
) -> Tuple[pd.DataFrame, pd.DataFrame, np.ndarray]:
    """
    Load a NASA C-MAPSS subset with strict schema parsing, run-to-failure
    ground truth RUL calculation for training engines, and zero test leakage.

    Args:
        subset_name: e.g. "FD001", "FD002", "FD003", "FD004" or "1", "2"
        data_dir: directory containing train_FD00x.txt, test_FD00x.txt, RUL_FD00x.txt

    Returns:
        (train_df, test_df, ground_truth_rul)
        - train_df: complete run-to-failure telemetry with calculated 'rul' column.
        - test_df: censored test fleet telemetry (isolated, NO RUL merged).
        - ground_truth_rul: 1D numpy array of final cycle remaining life.
    """
    # Normalize subset name
    sub = str(subset_name).strip().upper()
    if not sub.startswith("FD"):
        try:
            sub = f"FD{int(sub):03d}"
        except ValueError:
            raise ValueError(f"Invalid C-MAPSS subset identifier: {subset_name}")

    resolved_dir = _resolve_data_dir(data_dir)

    train_file = resolved_dir / f"train_{sub}.txt"
    test_file = resolved_dir / f"test_{sub}.txt"
    rul_file = resolved_dir / f"RUL_{sub}.txt"

    if not train_file.is_file():
        raise FileNotFoundError(f"Missing training file: {train_file}")
    if not test_file.is_file():
        raise FileNotFoundError(f"Missing test file: {test_file}")
    if not rul_file.is_file():
        raise FileNotFoundError(f"Missing ground-truth RUL file: {rul_file}")

    # Read space-delimited text with whitespace and trailing column handling
    train_df = pd.read_csv(train_file, sep=r"\s+", header=None)
    if train_df.shape[1] > 26:
        train_df = train_df.iloc[:, :26]
    train_df.columns = COLS

    test_df = pd.read_csv(test_file, sep=r"\s+", header=None)
    if test_df.shape[1] > 26:
        test_df = test_df.iloc[:, :26]
    test_df.columns = COLS

    # Training ground truth RUL: run-to-failure trajectory
    # actual RUL = max_cycle_per_unit - current_cycle
    train_df["rul"] = train_df.groupby("unit")["cycle"].transform("max") - train_df["cycle"]

    # Ground truth test RUL array (kept completely separate to guarantee ZERO test leakage)
    rul_raw = pd.read_csv(rul_file, sep=r"\s+", header=None)
    ground_truth_rul = rul_raw.iloc[:, 0].to_numpy(dtype=float)

    return train_df, test_df, ground_truth_rul


def verify_dataset_integrity(data_dir: str = "data/raw") -> dict:
    """
    Validates existence, schema conformity, and expected engine counts
    for all 4 C-MAPSS subsets (FD001 - FD004).

    Returns:
        {'status': 'PASSED', 'FD001': 'OK', 'FD002': 'OK', 'FD003': 'OK', 'FD004': 'OK'}
    """
    subsets = ["FD001", "FD002", "FD003", "FD004"]
    result = {}
    all_passed = True

    resolved_dir = _resolve_data_dir(data_dir)

    for sub in subsets:
        try:
            train_df, test_df, rul = load_subset(sub, data_dir=resolved_dir)

            tr_units = train_df["unit"].nunique()
            te_units = test_df["unit"].nunique()
            rul_count = len(rul)

            expected = EXPECTED_ENGINE_COUNTS[sub]

            # Validate train units
            exp_tr = expected["train_units"]
            tr_ok = (tr_units in exp_tr) if isinstance(exp_tr, (tuple, list, set)) else (tr_units == exp_tr)

            # Validate test units and RUL counts match
            exp_te = expected["test_units"]
            te_ok = (te_units in exp_te) if isinstance(exp_te, (tuple, list, set)) else (te_units == exp_te)
            rul_ok = (rul_count in exp_te) if isinstance(exp_te, (tuple, list, set)) else (rul_count == exp_te)

            # Validate column presence
            cols_ok = (list(train_df.columns[:26]) == COLS) and (list(test_df.columns) == COLS)

            if tr_ok and te_ok and rul_ok and cols_ok:
                result[sub] = "OK"
            else:
                result[sub] = f"MISMATCH (tr={tr_units}, te={te_units}, rul={rul_count})"
                all_passed = False
        except Exception as e:
            result[sub] = f"ERROR: {e}"
            all_passed = False

    output = {"status": "PASSED" if all_passed else "FAILED"}
    output.update(result)
    return output


if __name__ == "__main__":
    res = verify_dataset_integrity()
    print(res)

