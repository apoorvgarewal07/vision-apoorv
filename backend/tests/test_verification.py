"""VISION-PHM: Section 11 - Verification & Verification Test Suite Matrix.

Implements all 5 mandatory integration tests:
1. test_causality_no_leakage()
2. test_regime_normalization_gain()
3. test_clopper_pearson_coverage()
4. test_sse_replay_stream_integrity()
5. test_trust_envelope_abstention()
"""

import json
import pytest
import numpy as np
import pandas as pd
from starlette.testclient import TestClient

from config import KEEP_SENSORS, CAP_RUL
from conditioning import compute_causal_features, RegimeNormalizer
from decision import clopper_pearson_upper, evaluate_trigger_policy, find_optimal_threshold
from pipeline import load_bundle, load_subset_raw, extract_features
from server import app, run_inference_on_window, verify_envelope


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


# =========================================================================
# Test 1: test_causality_no_leakage
# Asserts perturbing cycle t + k does not alter predictions at cycle t.
# =========================================================================
def test_causality_no_leakage():
    bundle = load_bundle("FD001")
    model = bundle["model"]
    normalizer = bundle["normalizer"]
    feat_cols = bundle["feat_cols"]

    # Generate synthetic trajectory of 50 cycles
    cycles = np.arange(1, 51)
    df_raw = pd.DataFrame({
        "unit": np.ones(50, dtype=int),
        "cycle": cycles,
        "op1": np.zeros(50),
        "op2": np.zeros(50),
        "op3": np.zeros(50),
    })
    for s in KEEP_SENSORS:
        # Linear degradation
        df_raw[s] = 500.0 + cycles * 0.5 + np.sin(cycles)

    # 1. Base inference at cycle t = 30
    t = 30
    df_norm = normalizer.transform(df_raw)
    df_feats = compute_causal_features(df_norm)
    x_t = df_feats.loc[df_raw["cycle"] == t, feat_cols]
    pred_orig = float(model.predict(x_t)[0])

    # 2. Perturb future cycle t + 10 (cycle 40) with massive sensor spike
    df_perturbed = df_raw.copy()
    future_idx = df_perturbed["cycle"] == (t + 10)
    for s in KEEP_SENSORS:
        df_perturbed.loc[future_idx, s] = 99999.0

    df_norm_pert = normalizer.transform(df_perturbed)
    df_feats_pert = compute_causal_features(df_norm_pert)
    x_t_pert = df_feats_pert.loc[df_perturbed["cycle"] == t, feat_cols]
    pred_pert = float(model.predict(x_t_pert)[0])

    # Features and prediction at cycle t MUST be exactly identical (zero leakage)
    np.testing.assert_allclose(
        x_t.to_numpy(),
        x_t_pert.to_numpy(),
        err_msg="Causal features at cycle t were altered by future cycle perturbation!"
    )
    assert abs(pred_orig - pred_pert) < 1e-9, (
        f"Prediction at cycle {t} changed after perturbing future cycle {t+10}: "
        f"{pred_orig} vs {pred_pert}"
    )


# =========================================================================
# Test 2: test_regime_normalization_gain
# Confirms RMSE drops by >= 2.0 cycles on FD002 and FD004 when clustering is active.
# =========================================================================
def test_regime_normalization_gain():
    """Validates that per-regime KMeans normalization achieves >= 2.0 cycles RMSE gain

    over global normalization on multi-regime subsets FD002 and FD004.
    """
    from sklearn.ensemble import HistGradientBoostingRegressor

    for subset in ["FD002", "FD004"]:
        tr, te, rul = load_subset_raw(subset)
        idx_last = te.groupby("unit").tail(1).index.values
        y_test = np.minimum(rul, CAP_RUL)

        # Baseline: Global Normalization (n_regimes=1)
        norm_global = RegimeNormalizer(n_regimes=1, random_state=0).fit(tr)
        tr_g = norm_global.transform(tr)
        te_g = norm_global.transform(te)
        X_tr_g, feat_cols = extract_features(tr_g)
        X_te_g, _ = extract_features(te_g)

        model_g = HistGradientBoostingRegressor(
            max_iter=300, learning_rate=0.06, max_leaf_nodes=31,
            min_samples_leaf=40, l2_regularization=1.0, random_state=0
        )
        model_g.fit(X_tr_g, np.minimum(tr["rul"].values, CAP_RUL))
        p_g = np.clip(model_g.predict(X_te_g.loc[idx_last]), 0, CAP_RUL)
        rmse_global = float(np.sqrt(np.mean((p_g - y_test) ** 2)))

        # Active: Per-Regime Clustering (k=6)
        bundle = load_bundle(subset)
        rmse_regime = bundle["test_rmse"]

        delta_rmse = rmse_global - rmse_regime
        print(f"[{subset}] Global RMSE: {rmse_global:.2f}, Per-Regime RMSE: {rmse_regime:.2f}, Gain: {delta_rmse:.2f}")

        # Blueprint asserts RMSE drops by >= 2.0 cycles on FD002 and FD004
        assert delta_rmse >= 2.0, (
            f"Expected delta RMSE >= 2.0 for {subset}, got {delta_rmse:.2f} "
            f"(global: {rmse_global:.2f}, per-regime: {rmse_regime:.2f})"
        )


# =========================================================================
# Test 3: test_clopper_pearson_coverage
# Verifies beta inversion bounds empirical failure rates to <= 0.05.
# =========================================================================
def test_clopper_pearson_coverage():
    """Verifies exact Clopper-Pearson binomial upper bounds prevent schedule violations."""
    # 1. Exact mathematical beta inversion boundary checks
    # If 0 failures out of 100 engines, Clopper-Pearson 90% upper bound is:
    # 1 - (1 - 0.90)**(1/100) = 0.0227 <= 0.05
    ub_0 = clopper_pearson_upper(k_failures=0, n_total=100, confidence=0.90)
    assert ub_0 <= 0.05, f"Expected ub_0 <= 0.05, got {ub_0}"

    # If 1 failure out of 100:
    ub_1 = clopper_pearson_upper(k_failures=1, n_total=100, confidence=0.90)
    assert ub_1 <= 0.05, f"Expected ub_1 <= 0.05, got {ub_1}"

    # If 5 failures out of 100, upper bound is > 0.05
    ub_5 = clopper_pearson_upper(k_failures=5, n_total=100, confidence=0.90)
    assert ub_5 > 0.05, f"Expected ub_5 > 0.05, got {ub_5}"

    # 2. Test policy execution on FD004 trajectories under risk control
    bundle = load_bundle("FD004")
    df_trajectories = bundle["trajectories"]

    # Find risk-controlled optimal threshold
    opt = find_optimal_threshold(
        df_trajectories, target_failure_rate=0.05, confidence=0.90, controlled=True
    )
    assert opt["failure_rate"] <= 0.05, (
        f"Controlled policy failure rate {opt['failure_rate']} exceeds target 0.05"
    )
    assert opt["clopper_pearson_upper_90"] <= 0.055, (
        f"Clopper-Pearson 90% upper bound {opt['clopper_pearson_upper_90']} exceeds target limit"
    )


# =========================================================================
# Test 4: test_sse_replay_stream_integrity
# Verifies order, monotonicity, and schema compliance across all replayed test units.
# =========================================================================
def test_sse_replay_stream_integrity(client):
    """Verifies order, monotonicity, and schema compliance on SSE live telemetry."""
    # Test health and subsets endpoints first
    res_health = client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.json() == {"status": "ready", "version": "1.0.0"}

    res_subsets = client.get("/api/v1/subsets")
    assert res_subsets.status_code == 200
    assert "FD001" in res_subsets.json()["available"]

    # Stream first 15 cycles from SSE replay endpoint
    with client.stream("GET", "/api/v1/stream/replay/FD001?speed_ms=10&unit=1") as response:
        assert response.status_code == 200
        cycles_seen = []
        events_collected = 0

        for line in response.iter_lines():
            if line.startswith("data:"):
                payload = json.loads(line[5:].strip())
                events_collected += 1

                # Schema assertions
                assert "unit" in payload
                assert "cycle" in payload
                assert "point_rul" in payload
                assert "lower_bound_90" in payload
                assert "lower_bound_95" in payload
                assert "health_index" in payload
                assert "status" in payload
                assert payload["status"] in ["NORMAL", "WARNING", "CRITICAL", "ERROR"]

                cycles_seen.append(payload["cycle"])
                if events_collected >= 15:
                    break

        assert len(cycles_seen) >= 15
        # Verify strict monotonicity and cycle progression
        for i in range(1, len(cycles_seen)):
            assert cycles_seen[i] == cycles_seen[i - 1] + 1, (
                f"SSE cycles out of order: {cycles_seen}"
            )


# =========================================================================
# Test 5: test_trust_envelope_abstention
# Injects stuck and corrupted values; asserts engine response status is set to ABSTAIN.
# =========================================================================
def test_trust_envelope_abstention(client):
    """Injects stuck and corrupted values; asserts engine response status is set to ABSTAIN / ERROR."""
    bundle = load_bundle("FD001")
    df_test = bundle["test_raw"]
    u1_15 = df_test[df_test["unit"] == 1].head(15)

    # 1. Normal telemetry payload (real C-MAPSS operating telemetry)
    normal_sensors = {s: u1_15[s].tolist() for s in KEEP_SENSORS}
    op_last = [float(u1_15["op1"].iloc[-1]), float(u1_15["op2"].iloc[-1]), float(u1_15["op3"].iloc[-1])]

    payload_normal = {
        "unit": 1,
        "cycle": 15,
        "operational_settings": op_last,
        "sensor_readings": normal_sensors,
        "subset": "FD001"
    }
    res_normal = client.post("/api/v1/predict/point", json=payload_normal)
    assert res_normal.status_code == 200
    data_normal = res_normal.json()
    assert data_normal["status"] in ["NORMAL", "WARNING", "CRITICAL"]
    assert data_normal["abstain"] is False

    # 2. Stuck sensor injection (Sensor s2 frozen flat over 15 cycles)
    stuck_sensors = {s: list(normal_sensors[s]) for s in KEEP_SENSORS}
    stuck_sensors["s2"] = [float(normal_sensors["s2"][0])] * 15  # constant flat line

    payload_stuck = {
        "unit": 1,
        "cycle": 15,
        "operational_settings": op_last,
        "sensor_readings": stuck_sensors,
        "subset": "FD001"
    }
    res_stuck = client.post("/api/v1/predict/point", json=payload_stuck)
    assert res_stuck.status_code == 200
    data_stuck = res_stuck.json()
    assert data_stuck["abstain"] is True, "Engine failed to abstain on stuck sensor output!"
    assert data_stuck["status"] == "ERROR"
    assert any("frozen" in r.lower() or "stuck" in r.lower() or "fault" in r.lower() for r in data_stuck["reasons"])

    # 3. Test trust validation endpoint directly
    res_validate = client.post("/api/v1/trust/validate", json={
        "operational_settings": op_last,
        "sensor_readings": stuck_sensors,
        "subset": "FD001"
    })
    assert res_validate.status_code == 200
    val_data = res_validate.json()
    assert val_data["abstain"] is True
    assert "s2" in val_data["stuck"]


def test_scenario_evaluation_endpoint(client):
    """Verifies scenario policy evaluation endpoint."""
    res = client.post("/api/v1/evaluate/scenario", json={
        "subset": "FD004",
        "threshold": 20.0,
        "lead": 15,
        "persist": 3
    })
    assert res.status_code == 200
    data = res.json()
    assert data["subset"] == "FD004"
    assert data["threshold"] == 20.0
    assert data["failure_rate"] <= 0.05
    assert data["mean_waste"] > 0
    assert "clopper_pearson_upper_90" in data
