"""VISION-PHM: Layer 5 - Maintenance Orchestration & Clopper-Pearson Risk Control.

Implements exact Clopper-Pearson risk-controlled threshold selection,
persistence filtering, lead-time buffering, and fleet maintenance policy evaluation.
"""

from typing import Dict, List, Optional, Tuple, Union
import numpy as np
import pandas as pd
from scipy.stats import beta

from config import LEAD_TIME, PERSISTENCE_CYCLES, TARGET_FAILURE_RATE


def clopper_pearson_upper(k_failures: int, n_total: int, confidence: float = 0.90) -> float:
    """Exact binomial Clopper-Pearson upper confidence bound on failure probability:

    UB(theta) = Beta_inv(confidence, k + 1, n - k)
    """
    if n_total <= 0:
        return 1.0
    if k_failures >= n_total:
        return 1.0
    return float(beta.ppf(confidence, k_failures + 1, n_total - k_failures))


def evaluate_trigger_policy(
    df_trajectories: pd.DataFrame,
    threshold: float,
    lead: int = LEAD_TIME,
    persist: int = PERSISTENCE_CYCLES,
    lb_col: str = "lb"
) -> Tuple[float, float, Dict]:
    """Evaluates fleet maintenance trigger policy on engine trajectories.

    - lb_hits: whether lower bound <= threshold
    - Persistence filter: sustained trigger for k-of-k consecutive cycles
    - Lead buffer: execution cycle = trigger_cycle + lead
    - Failure defined as execution cycle >= actual failure cycle (or no trigger)
    - Wasted cycles: cycles remaining if removed before failure

    Returns:
        (failure_rate, mean_wasted_cycles, summary_metrics)
    """
    failures = 0
    wasted_cycles = []
    total_units = df_trajectories["unit"].nunique()
    if total_units == 0:
        return 0.0, 0.0, {}

    unit_results = []

    for unit, g in df_trajectories.groupby("unit"):
        lb_hits = (g[lb_col] <= threshold).to_numpy(dtype=int)
        # Persistence filter (k-of-k consecutive cycles)
        if persist > 1:
            sustained = np.convolve(lb_hits, np.ones(persist, dtype=int), "full")[:len(lb_hits)] >= persist
        else:
            sustained = lb_hits.astype(bool)

        trigger_idx = np.nonzero(sustained)[0]
        max_cycle = int(g["cycle"].max())

        if len(trigger_idx) == 0:
            failures += 1
            unit_results.append({
                "unit": int(unit),
                "triggered": False,
                "failed": True,
                "trigger_cycle": None,
                "exec_cycle": None,
                "max_cycle": max_cycle,
                "wasted": 0
            })
        else:
            trigger_cycle = int(g["cycle"].iloc[trigger_idx[0]])
            exec_cycle = trigger_cycle + lead
            if exec_cycle >= max_cycle:
                failures += 1
                unit_results.append({
                    "unit": int(unit),
                    "triggered": True,
                    "failed": True,
                    "trigger_cycle": trigger_cycle,
                    "exec_cycle": exec_cycle,
                    "max_cycle": max_cycle,
                    "wasted": 0
                })
            else:
                waste = max_cycle - exec_cycle
                wasted_cycles.append(waste)
                unit_results.append({
                    "unit": int(unit),
                    "triggered": True,
                    "failed": False,
                    "trigger_cycle": trigger_cycle,
                    "exec_cycle": exec_cycle,
                    "max_cycle": max_cycle,
                    "wasted": int(waste)
                })

    fail_rate = float(failures / total_units)
    mean_waste = float(np.mean(wasted_cycles)) if wasted_cycles else 0.0

    cp_upper_90 = clopper_pearson_upper(failures, total_units, confidence=0.90)

    summary = {
        "total_units": total_units,
        "failed_units": failures,
        "failure_rate": round(fail_rate, 4),
        "clopper_pearson_upper_90": round(cp_upper_90, 4),
        "mean_wasted_cycles": round(mean_waste, 2),
        "units": unit_results
    }

    return fail_rate, mean_waste, summary


def find_optimal_threshold(
    df_trajectories: pd.DataFrame,
    target_failure_rate: float = TARGET_FAILURE_RATE,
    confidence: float = 0.90,
    controlled: bool = True,
    lead: int = LEAD_TIME,
    persist: int = PERSISTENCE_CYCLES,
    lb_col: str = "lb"
) -> Dict:
    """Finds the optimal threshold minimizing wasted cycles under Clopper-Pearson risk control.

    Controlled: Clopper-Pearson upper bound <= target_failure_rate
    Naive: empirical failure rate <= target_failure_rate
    """
    best_thresh = None
    best_waste = np.inf
    best_summary = {}

    grid = list(range(0, 126, 2))

    for th in grid:
        fail_rate, mean_waste, summary = evaluate_trigger_policy(
            df_trajectories, threshold=th, lead=lead, persist=persist, lb_col=lb_col
        )
        failures = summary["failed_units"]
        total = summary["total_units"]

        if controlled:
            ub = clopper_pearson_upper(failures, total, confidence=confidence)
            admissible = (ub <= target_failure_rate)
        else:
            admissible = (fail_rate <= target_failure_rate)

        if admissible:
            if mean_waste < best_waste:
                best_waste = mean_waste
                best_thresh = th
                best_summary = summary

    # Fallback to threshold 0 if none strictly admissible
    if best_thresh is None:
        best_thresh = 0.0
        _, best_waste, best_summary = evaluate_trigger_policy(
            df_trajectories, threshold=0.0, lead=lead, persist=persist, lb_col=lb_col
        )

    return {
        "optimal_threshold": float(best_thresh),
        "controlled": controlled,
        "target_failure_rate": target_failure_rate,
        "mean_wasted_cycles": float(best_waste),
        "failure_rate": best_summary.get("failure_rate", 0.0),
        "clopper_pearson_upper_90": best_summary.get("clopper_pearson_upper_90", 0.0)
    }


def dynamic_optimal_removal_rule(
    hazard_rate: float,
    cost_waste: float,
    cost_failure: float
) -> bool:
    """Dynamic Optimal Removal Rule:

    Remove engine when Hazard(s) = f(s) / (1 - F(s)) >= c_w / C_f.
    """
    if cost_failure <= 0:
        return True
    cost_ratio = cost_waste / cost_failure
    return hazard_rate >= cost_ratio

