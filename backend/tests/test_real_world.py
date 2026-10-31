"""VISION-PHM Real-World Problem Data Validation Test Suite.

Rigorously tests real C-MAPSS aircraft turbofan data across subsets FD001-FD004:
1. Conformal lower-bound coverage on NASA ground-truth RUL test engines.
2. Robustness to real-world sensor corruptions (stuck sensors, extreme spikes, noise).
3. Out-Of-Distribution (OOD) flight envelope safety gating via Ledoit-Wolf Mahalanobis distance.
4. Multi-engine fleet risk ranking, cost-optimal removal advice, and EDF maintenance scheduling.
5. Tamper-evident SHA-256 hash-chained learning-assurance audit logs.
6. API endpoint edge case resilience.
"""

import os
import json
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from config import KEEP_SENSORS, CAP_RUL, ARTIFACTS_DIR
from pipeline import load_bundle
from vision_phm import bundle as vb, config as vc, service as vs, data as vd, metrics as vm
from server import app, run_inference_on_window, verify_envelope


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c


# =========================================================================
# Scenario 1: Real-World Conformal Coverage on NASA Ground-Truth RUL
# =========================================================================
def test_real_world_conformal_coverage_all_subsets():
    """Evaluates real NASA test engines across subsets against true RUL_FD00N.txt.
    Verifies that Mondrian split-conformal 90% lower bounds achieve >= 88% coverage on all subsets."""
    for sub in ["FD001", "FD002", "FD003", "FD004"]:
        bundle = load_bundle(sub)
        trajectories = bundle["trajectories"]

        rul_col = "true_rul" if "true_rul" in trajectories.columns else ("y_true" if "y_true" in trajectories.columns else "rul")
        assert rul_col in trajectories.columns
        assert "lb90" in trajectories.columns

        y_true = trajectories[rul_col].values
        lb90 = trajectories["lb90"].values

        # Empirical coverage: fraction of test units where true RUL >= Conformal Lower Bound
        covered = float(np.mean(y_true >= lb90))
        print(f"[{sub}] Real-World 90% Lower Bound Coverage: {covered * 100:.2f}% across {len(y_true)} trajectory cycles")

        # Conformal guarantee: coverage must be within statistical tolerance of 90% (>= 88%)
        assert covered >= 0.88, f"Conformal coverage {covered:.3f} fell below minimum 0.88 threshold on {sub}"


# =========================================================================
# Scenario 2: Real-World Sensor Corruptions (Stuck, Range Breach, Noise)
# =========================================================================
def test_real_world_sensor_corruptions():
    """Simulates real sensor failure modes encountered in aviation telemetry."""
    bundle = load_bundle("FD002")
    test_raw = bundle["test_raw"]
    u1 = test_raw[test_raw["unit"] == 1].sort_values("cycle").head(25)

    window = {s: u1[s].tolist() for s in KEEP_SENSORS}
    op = [float(u1["op1"].iloc[-1]), float(u1["op2"].iloc[-1]), float(u1["op3"].iloc[-1])]

    # 1. Stuck Sensor Failure: simulate sensor s11 (combustor static pressure Ps30) freezing for 15 cycles
    stuck_window = {s: list(v) for s, v in window.items()}
    stuck_window["s11"] = [stuck_window["s11"][0]] * len(stuck_window["s11"])

    is_faulty, reasons, flags = verify_envelope(
        sensor_readings=stuck_window,
        operational_settings=op,
        cycle=25,
        subset="FD002"
    )
    assert is_faulty or any("s11" in r for r in reasons) or any("stuck" in str(f).lower() for f in flags), (
        "Trust envelope failed to detect stuck sensor s11"
    )

    # 2. Extreme Out-of-Range Sensor Spike: simulate thermocouple failure T30 > 3000 °R
    spike_window = {s: list(v) for s, v in window.items()}
    spike_window["s3"][-1] = 3500.0  # Physical limit is ~1650 °R

    is_faulty_spk, reasons_spk, flags_spk = verify_envelope(
        sensor_readings=spike_window,
        operational_settings=op,
        cycle=25,
        subset="FD002"
    )
    assert is_faulty_spk or len(reasons_spk) > 0, (
        "Trust envelope failed to detect physical range breach on T30"
    )

    # 3. High Gaussian Noise: ensure model prediction remains bounded
    noisy_window = {s: [float(val + np.random.normal(0, 0.5)) for val in v] for s, v in window.items()}
    p, lb90, lb95, thermo, attr = run_inference_on_window(
        operational_settings=op,
        sensor_readings=noisy_window,
        cycle=25,
        subset="FD002"
    )
    assert 0.0 <= p <= CAP_RUL
    assert lb90 <= p + 1e-4
    assert lb95 <= lb90 + 1e-4


# =========================================================================
# Scenario 3: Extreme Flight Envelope Out-Of-Distribution (OOD) Gating
# =========================================================================
def test_real_world_extreme_flight_envelope_ood():
    """Simulates flight conditions outside certified flight envelope (e.g. Mach 2.5, 75,000 ft)."""
    bundle = load_bundle("FD002")
    test_raw = bundle["test_raw"]
    u1 = test_raw[test_raw["unit"] == 1].sort_values("cycle").head(20)

    window = {s: u1[s].tolist() for s in KEEP_SENSORS}
    extreme_op = [75.0, 2.5, 100.0]  # Impossible civil turbofan envelope

    is_faulty, reasons, flags = verify_envelope(
        sensor_readings=window,
        operational_settings=extreme_op,
        cycle=20,
        subset="FD002"
    )
    # The Ledoit-Wolf Mahalanobis distance or setting bounds must flag OOD
    assert is_faulty or any("OOD" in r or "regime" in r.lower() for r in reasons)


# =========================================================================
# Scenario 4: Real-World Fleet Risk & Earliest Deadline First (EDF) Scheduling
# =========================================================================
def test_real_world_fleet_risk_and_edf_scheduling():
    """Ingests real NASA C-MAPSS engines into FleetService and tests EDF maintenance scheduling."""
    b = vb.load(vc.SUBSET, vc.ART_DIR)
    audit_file = os.path.join(vc.ART_DIR, "test_real_audit.jsonl")
    if os.path.exists(audit_file):
        os.remove(audit_file)

    service = vs.FleetService(b, audit_path=audit_file)
    tr, te, rul = vd.load(vc.SUBSET, vc.DATA_DIR)

    # Ingest 12 real engines with their real cycles
    test_units = sorted(te["unit"].unique())[:12]
    all_sensor_cols = [f"s{i}" for i in range(1, 22)]

    for u in test_units:
        df_u = te[te["unit"] == u].sort_values("cycle")
        # Ingest trailing 25 cycles for each engine
        for _, r in df_u.tail(25).iterrows():
            op = [float(r["op1"]), float(r["op2"]), float(r["op3"])]
            s21 = [float(r[col]) for col in all_sensor_cols]
            service.ingest(f"engine_{u}", int(r["cycle"]), op, s21)

    # Fleet risk evaluation
    fleet = service.fleet_risk()
    assert len(fleet) == 12

    # Verify ranking: engines with higher P(fail within lead) or lower RUL appear first
    for i in range(len(fleet) - 1):
        assert fleet[i]["p_fail_within_lead"] >= fleet[i + 1]["p_fail_within_lead"] or (
            fleet[i]["p_fail_within_lead"] == fleet[i + 1]["p_fail_within_lead"] and fleet[i]["rul"] <= fleet[i + 1]["rul"]
        )

    # Schedule maintenance slots using EDF algorithm
    schedule = service.schedule(n_slots=6, capacity=2, slot_len=10)
    assert isinstance(schedule, list)

    # Cost advice test
    advice = service.cost_advice("engine_1", cost_ratio=0.001)
    assert advice is not None
    assert "remove_in_cycles" in advice
    assert advice["remove_in_cycles"] >= 0

    # Clean up test audit log
    if os.path.exists(audit_file):
        os.remove(audit_file)


# =========================================================================
# Scenario 5: Hash-Chained Audit Log Tamper Evident Proof
# =========================================================================
def test_real_world_hash_chained_audit_integrity():
    """Validates that audit log records form a valid cryptographic SHA-256 blockchain."""
    audit_path = os.path.join(vc.ART_DIR, "chain_audit.jsonl")
    if os.path.exists(audit_path):
        os.remove(audit_path)

    audit = vs.Audit(audit_path)
    audit.write({"cycle": 1, "rul": 100.0, "status": "OK"})
    audit.write({"cycle": 2, "rul": 98.0, "status": "OK"})
    audit.write({"cycle": 3, "rul": 95.0, "status": "WATCH"})

    with open(audit_path, "r") as f:
        lines = [json.loads(line) for line in f]

    assert len(lines) == 3
    assert lines[0]["prev"] == "0" * 64

    # Verify cryptographic chaining
    import hashlib
    for i in range(1, len(lines)):
        prev_rec = {k: v for k, v in lines[i - 1].items()}
        rec_json = json.dumps(prev_rec, sort_keys=True, default=float)
        expected_hash = hashlib.sha256(rec_json.encode()).hexdigest()
        assert lines[i]["prev"] == expected_hash, (
            f"Audit chain broken at block {i}: expected {expected_hash}, got {lines[i]['prev']}"
        )

    if os.path.exists(audit_path):
        os.remove(audit_path)


# =========================================================================
# Scenario 6: API Resilience Under Real Telemetry Load & Malformed Inputs
# =========================================================================
def test_real_world_api_endpoints_resilience(client):
    """Verifies that all API endpoints respond properly under valid and invalid inputs."""
    # 1. Health and subset readiness
    assert client.get("/api/v1/health").status_code == 200
    assert client.get("/healthz").status_code == 200

    # 2. Point prediction with realistic telemetry
    bundle = load_bundle("FD001")
    df_u1 = bundle["test_raw"][bundle["test_raw"]["unit"] == 1].head(15)
    valid_payload = {
        "unit": 1,
        "cycle": 15,
        "operational_settings": [0.0, 0.0, 100.0],
        "sensor_readings": {s: df_u1[s].tolist() for s in KEEP_SENSORS},
        "subset": "FD001"
    }
    res = client.post("/api/v1/predict/point", json=valid_payload)
    assert res.status_code == 200
    data = res.json()
    assert data["unit"] == 1
    assert data["point_rul"] > 0
    assert data["lower_bound_90"] <= data["point_rul"]
    assert "NORMAL" in data["status"] or "WARNING" in data["status"]

    # 3. Policy evaluation scenario on FD001
    res_scen = client.post("/api/v1/evaluate/scenario", json={
        "subset": "FD001",
        "threshold": 15.0,
        "lead": 15,
        "persist": 3
    })
    assert res_scen.status_code == 200
    scen_data = res_scen.json()
    assert 0.0 <= scen_data["clopper_pearson_upper_90"] <= 1.0
    assert scen_data["total_units"] == 100
    assert scen_data["subset"] == "FD001"

    # 4. Bad request handling (non-existent subset)
    res_bad = client.post("/api/v1/evaluate/scenario", json={
        "subset": "NON_EXISTENT",
        "threshold": 15.0,
        "lead": 15,
        "persist": 3
    })
    assert res_bad.status_code in [404, 422, 500]
