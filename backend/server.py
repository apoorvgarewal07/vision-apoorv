"""VISION-PHM: FastAPI Production REST & Streaming Server.

Implements all Layer 0 - Layer 5 endpoints and SSE streaming as specified in the blueprint:
- GET  /api/v1/health
- GET  /api/v1/subsets
- POST /api/v1/predict/point
- POST /api/v1/evaluate/scenario
- GET  /api/v1/stream/replay/{subset}
- POST /api/v1/trust/validate
"""

import asyncio
import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

from config import KEEP_SENSORS, CAP_RUL, ARTIFACTS_DIR
from conditioning import compute_causal_features
from conformal import predict_dual_bounds
from decision import evaluate_trigger_policy
from pipeline import load_bundle
from physics import compute_gas_path_deltas, compute_health_index, compute_sensor_attribution

from services import (
    oil_service,
    inspection_service,
    maintenance_service,
    aircraft_systems_service,
    fusion_engine,
    knowledge_graph_service,
    decision_service,
)

# In-memory registry of pre-trained subset models
BUNDLES: Dict[str, Any] = {}
FLEET_SERVICE: Any = None


def init_fleet_service():
    """Initializes the vision_phm FleetService and pre-populates initial fleet state."""
    global FLEET_SERVICE
    try:
        from vision_phm import bundle as vb, config as vc, service as vs, data as vd
        bundle = vb.load(vc.SUBSET, vc.ART_DIR)
        FLEET_SERVICE = vs.FleetService(bundle)
        tr, raw_test, rul = vd.load(vc.SUBSET, vc.DATA_DIR)
        first_units = sorted(raw_test["unit"].unique())[:3]
        all_sensor_cols = [f"s{i}" for i in range(1, 22)]
        for u in first_units:
            df_u = raw_test[raw_test["unit"] == u].sort_values("cycle")
            recent = df_u.tail(30)
            for _, r in recent.iterrows():
                op = [float(r["op1"]), float(r["op2"]), float(r["op3"])]
                s21 = [float(r[col]) for col in all_sensor_cols]
                FLEET_SERVICE.ingest(f"unit_{u}", int(r["cycle"]), op, s21)
        print(f"[VISION-PHM Server] Ingested {len(FLEET_SERVICE.engines)} fleet engines into FleetService.")
    except Exception as e:
        print(f"[VISION-PHM Server] Note initializing FleetService: {e}")


def load_all_bundles():
    """Loads all available subset models into memory."""
    for sub in ["FD001", "FD002", "FD003", "FD004"]:
        try:
            bundle_path = ARTIFACTS_DIR / f"bundle_{sub}.pkl"
            if bundle_path.exists():
                BUNDLES[sub] = load_bundle(sub)
                print(f"[VISION-PHM Server] Loaded bundle for {sub}")
        except Exception as e:
            print(f"[VISION-PHM Server] Warning: Could not load {sub}: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load pre-trained models
    load_all_bundles()
    init_fleet_service()
    yield
    # Shutdown
    BUNDLES.clear()


app = FastAPI(
    title="VISION-PHM Engine",
    version="1.0.0",
    description="Decision-First Prognostics and Health Management Engine for Turbofan Fleets",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)


# ==========================================
# Pydantic Request & Response Schemas
# ==========================================

class WindowTelemetry(BaseModel):
    unit: int = Field(..., description="Engine unit identifier", examples=[1])
    cycle: int = Field(..., description="Current operating cycle", examples=[45])
    operational_settings: List[float] = Field(
        ..., min_length=3, max_length=3, description="[op1, op2, op3] flight condition settings"
    )
    operational_settings_history: Optional[List[List[float]]] = Field(
        None, description="Optional historical sequence of [op1, op2, op3] over the window"
    )
    sensor_readings: Dict[str, List[float]] = Field(
        ..., description="Historical sensor reading window including the 14 KEEP channels"
    )
    subset: Optional[str] = Field("FD001", description="C-MAPSS fleet subset")


class RULResponse(BaseModel):
    unit: int
    cycle: int
    point_rul: float
    lower_bound_90: float
    lower_bound_95: float
    health_index: float
    status: str
    abstain: bool
    reasons: List[str]
    thermodynamics: Optional[Dict[str, float]] = None
    attributions: Optional[Dict[str, float]] = None


class ScenarioEvaluationRequest(BaseModel):
    subset: str = Field("FD004", description="Fleet subset to evaluate")
    threshold: float = Field(20.0, description="RUL lower-bound trigger threshold")
    lead: int = Field(15, description="Logistics lead buffer (cycles)")
    persist: int = Field(3, description="Persistence filter window (cycles)")


class ScenarioEvaluationResponse(BaseModel):
    subset: str
    threshold: float
    lead: int
    persist: int
    total_units: int
    failed_units: int
    failure_rate: float
    mean_waste: float
    clopper_pearson_upper_90: float


class RawTelemetryBatch(BaseModel):
    operational_settings: List[float] = Field(..., min_length=3, max_length=3)
    operational_settings_history: Optional[List[List[float]]] = None
    sensor_readings: Dict[str, List[float]]
    subset: Optional[str] = "FD001"


class TrustValidationResponse(BaseModel):
    ood: bool
    stuck: List[str]
    abstain: bool
    reasons: List[str]


class MaintenanceOptimizationPayload(BaseModel):
    subset: str = Field(default="FD001", description="C-MAPSS subset identifier")
    cost_failure: float = Field(default=100_000.0, description="Cost of an in-service failure ($)")
    cost_waste_per_cycle: float = Field(default=100.0, description="Cost of 1 wasted cycle ($/cycle)")
    lead_time: int = Field(default=15, description="Logistics lead buffer (cycles)")
    risk_budget_eps: float = Field(default=0.05, description="Maximum tolerable failure rate ceiling")


class GraphQueryPayload(BaseModel):
    query: str = Field(default="recurring", description="Query string e.g. 'recurring', 'evidence', 'inspection'")
    entity_id: str = Field(default="ENG-U24", description="Target entity ID in graph")


# ==========================================
# Core Inference Helper
# ==========================================

def run_inference_on_window(
    operational_settings: List[float],
    sensor_readings: Dict[str, List[float]],
    cycle: int,
    subset: str,
    op_history: Optional[List[List[float]]] = None
) -> Tuple[float, float, float, Dict, Dict]:
    """Transforms raw sensor window into 57-dim causal features and executes inference."""
    if subset not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{subset}.pkl").exists():
        BUNDLES[subset] = load_bundle(subset)
    bundle = BUNDLES.get(subset)
    if not bundle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Subset {subset} not loaded or unavailable."
        )

    # 1. Reconstruct historical DataFrame window
    window_length = max(len(v) for v in sensor_readings.values()) if sensor_readings else 1
    start_cycle = max(1, cycle - window_length + 1)
    cycles = list(range(start_cycle, start_cycle + window_length))

    raw_data: Dict[str, Any] = {"unit": 1, "cycle": cycles}
    # Operational settings
    if op_history and len(op_history) == window_length and all(isinstance(o, (list, tuple)) and len(o) >= 3 for o in op_history):
        raw_data["op1"] = [float(o[0]) for o in op_history]
        raw_data["op2"] = [float(o[1]) for o in op_history]
        raw_data["op3"] = [float(o[2]) for o in op_history]
    else:
        raw_data["op1"] = [float(operational_settings[0])] * window_length
        raw_data["op2"] = [float(operational_settings[1])] * window_length
        raw_data["op3"] = [float(operational_settings[2])] * window_length

    for s in KEEP_SENSORS:
        if s in sensor_readings and len(sensor_readings[s]) == window_length:
            raw_data[s] = sensor_readings[s]
        elif s in sensor_readings and len(sensor_readings[s]) > 0:
            # Pad or trim to window length
            vals = sensor_readings[s]
            if len(vals) < window_length:
                vals = [vals[0]] * (window_length - len(vals)) + vals
            else:
                vals = vals[-window_length:]
            raw_data[s] = vals
        else:
            # Mask missing channel with train global mean
            raw_data[s] = [bundle["normalizer"].global_mean.get(s, 0.0)] * window_length

    df_raw = pd.DataFrame(raw_data)

    # 2. Layer 1 Conditioning (Zero-Leakage Regime Normalization)
    df_norm = bundle["normalizer"].transform(df_raw)

    # 3. Layer 1 Causal Trailing Features (57 dimensions)
    df_feats = compute_causal_features(df_norm)
    feature_row = df_feats.iloc[[-1]]  # latest cycle features

    # Ensure all 57 columns match model training signature
    feat_cols = bundle["feat_cols"]
    for col in feat_cols:
        if col not in feature_row.columns:
            feature_row[col] = 0.0
    X_curr = feature_row[feat_cols]

    # 4. Layer 3 Prognostic Inference Core
    raw_pred = float(bundle["model"].predict(X_curr)[0])
    p_pred = float(np.clip(raw_pred, 0, CAP_RUL))

    # 5. Layer 4 Mondrian Conformal Calibration
    p, lb90, lb95 = predict_dual_bounds(p_pred, bundle["calib_90"], bundle["calib_95"])

    # 6. Layer 2 Physics-Aware Health Index & Thermodynamics
    current_sensors = {s: float(df_raw[s].iloc[-1]) for s in KEEP_SENSORS if s in df_raw.columns}
    thermo = compute_gas_path_deltas(current_sensors)
    hi = compute_health_index(p, cap_rul=CAP_RUL)

    # Sensor attributions
    attributions = compute_sensor_attribution(
        sensor_features=current_sensors,
        reference_means=bundle["normalizer"].global_mean,
        reference_stds=bundle["normalizer"].global_std
    )

    vector = X_curr.to_numpy()[0]
    return p, lb90, lb95, thermo, attributions


def verify_envelope(
    sensor_readings: Dict[str, List[float]],
    operational_settings: List[float],
    cycle: int,
    subset: str,
    op_history: Optional[List[List[float]]] = None
) -> Tuple[bool, List[str], List[Dict]]:
    """Evaluates Trust Envelope for stuck sensors, numerical corruptions, and OOD."""
    if subset not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{subset}.pkl").exists():
        BUNDLES[subset] = load_bundle(subset)
    bundle = BUNDLES.get(subset)
    if not bundle:
        return True, ["Subset bundle not loaded"], []

    window_len = max(len(v) for v in sensor_readings.values()) if sensor_readings else 0
    df_window = pd.DataFrame(sensor_readings)

    # Transform latest feature vector for Mahalanobis OOD
    try:
        cycles = list(range(max(1, cycle - window_len + 1), max(1, cycle - window_len + 1) + window_len))
        raw_dict: Dict[str, Any] = {"unit": 1, "cycle": cycles}
        if op_history and len(op_history) == window_len and all(isinstance(o, (list, tuple)) and len(o) >= 3 for o in op_history):
            raw_dict["op1"] = [float(o[0]) for o in op_history]
            raw_dict["op2"] = [float(o[1]) for o in op_history]
            raw_dict["op3"] = [float(o[2]) for o in op_history]
        else:
            raw_dict["op1"] = [float(operational_settings[0])] * window_len
            raw_dict["op2"] = [float(operational_settings[1])] * window_len
            raw_dict["op3"] = [float(operational_settings[2])] * window_len

        for s in KEEP_SENSORS:
            if s in sensor_readings:
                raw_dict[s] = sensor_readings[s]
            else:
                raw_dict[s] = [bundle["normalizer"].global_mean.get(s, 0.0)] * window_len
        df_raw = pd.DataFrame(raw_dict)
        df_norm = bundle["normalizer"].transform(df_raw)
        df_feats = compute_causal_features(df_norm)
        X_curr = df_feats.iloc[[-1]][bundle["feat_cols"]].to_numpy()[0]
    except Exception:
        X_curr = np.zeros(len(bundle["feat_cols"]))

    safety_res = bundle["trust_envelope"].evaluate_safety(
        current_vector=X_curr,
        raw_window=df_window
    )

    return safety_res["abstain"], safety_res["reasons"], safety_res["flags"]


FRONTEND_DIR = Path(__file__).parent.parent / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"

if FRONTEND_DIST.exists() and (FRONTEND_DIST / "assets").exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")
    app.mount("/app", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")


# ==========================================
# REST API Endpoints
# ==========================================

@app.get("/", include_in_schema=False)
async def root_index():
    """Serves the VISION-PHM flight deck dashboard."""
    if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
        return FileResponse(FRONTEND_DIST / "index.html")
    index_path = FRONTEND_DIR / "index.html"
    if index_path.exists():
        return FileResponse(index_path)
    return await root_dashboard()


@app.get("/style.css", include_in_schema=False)
async def get_css():
    css_path = FRONTEND_DIR / "style.css"
    if css_path.exists():
        return FileResponse(css_path, media_type="text/css")
    raise HTTPException(status_code=404)


@app.get("/app.js", include_in_schema=False)
async def get_js():
    js_path = FRONTEND_DIR / "app.js"
    if js_path.exists():
        return FileResponse(js_path, media_type="application/javascript")
    raise HTTPException(status_code=404)


@app.get("/monitor", response_class=HTMLResponse, include_in_schema=False)
async def root_dashboard():
    """Interactive root dashboard for VISION-PHM."""
    available_subsets = list(BUNDLES.keys()) or ["FD001", "FD002", "FD003", "FD004"]
    subsets_html = "".join([f'<span class="badge">{s}</span>' for s in available_subsets])
    
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VISION-PHM Engine • Decision-First Turbofan Prognostics</title>
  <style>
    :root {{
      --bg: #0b0f19;
      --surface: #111827;
      --card: #1f2937;
      --border: #374151;
      --accent: #3b82f6;
      --accent-hover: #2563eb;
      --text: #f3f4f6;
      --text-muted: #9ca3af;
      --success: #10b981;
      --warning: #f59e0b;
      --danger: #ef4444;
    }}
    * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }}
    body {{ background: var(--bg); color: var(--text); padding: 40px 20px; line-height: 1.6; }}
    .container {{ max-width: 960px; margin: 0 auto; }}
    .header {{ margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }}
    .status-pill {{ display: inline-flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600; padding: 4px 12px; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); margin-bottom: 12px; }}
    .dot {{ width: 8px; height: 8px; border-radius: 50%; background: var(--success); animation: pulse 2s infinite; }}
    @keyframes pulse {{ 0% {{ opacity: 1; }} 50% {{ opacity: 0.4; }} 100% {{ opacity: 1; }} }}
    h1 {{ font-size: 32px; font-weight: 700; letter-spacing: -0.02em; margin-bottom: 8px; }}
    p.lead {{ color: var(--text-muted); font-size: 16px; }}
    .grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 32px; }}
    .card {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }}
    .card h3 {{ font-size: 16px; font-weight: 600; margin-bottom: 12px; color: var(--text); }}
    .card p {{ font-size: 14px; color: var(--text-muted); margin-bottom: 16px; }}
    .badge {{ display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 4px; background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.3); margin-right: 6px; margin-bottom: 6px; }}
    .btn {{ display: inline-flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; padding: 10px 18px; border-radius: 8px; text-decoration: none; transition: all 0.2s; }}
    .btn-primary {{ background: var(--accent); color: white; }}
    .btn-primary:hover {{ background: var(--accent-hover); }}
    .btn-secondary {{ background: var(--card); color: var(--text); border: 1px solid var(--border); }}
    .btn-secondary:hover {{ background: #374151; }}
    .endpoints {{ background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 24px; margin-bottom: 32px; }}
    .endpoint-row {{ display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-family: monospace; font-size: 14px; }}
    .endpoint-row:last-child {{ border-bottom: none; }}
    .method {{ padding: 2px 8px; border-radius: 4px; font-weight: 700; font-size: 12px; margin-right: 12px; }}
    .method-get {{ background: rgba(16, 185, 129, 0.2); color: #6ee7b7; }}
    .method-post {{ background: rgba(59, 130, 246, 0.2); color: #93c5fd; }}
    .live-monitor {{ background: #000; border: 1px solid #1f2937; border-radius: 12px; padding: 20px; font-family: monospace; font-size: 13px; color: #10b981; max-height: 240px; overflow-y: auto; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="status-pill"><div class="dot"></div> ENGINE READY • PRODUCTION STATUS</div>
      <h1>VISION-PHM Engine</h1>
      <p class="lead">Decision-First Prognostics and Health Management Architecture with Conformal Bounds & Risk Control.</p>
    </div>

    <div class="grid">
      <div class="card">
        <h3>Loaded Fleet Models</h3>
        <p>Pre-trained zero-leakage models with 57-dim causal features and Mondrian calibration tables.</p>
        <div>{subsets_html}</div>
      </div>
      <div class="card">
        <h3>Interactive API Documentation</h3>
        <p>Explore all REST and SSE endpoints with Swagger UI schema validation and instant test execution.</p>
        <div style="display: flex; gap: 10px;">
          <a class="btn btn-primary" href="/docs">Open Swagger Docs</a>
          <a class="btn btn-secondary" href="/redoc">Open ReDoc</a>
        </div>
      </div>
    </div>

    <div class="endpoints">
      <h3 style="margin-bottom: 16px;">Core API Routes</h3>
      <div class="endpoint-row">
        <div><span class="method method-get">GET</span> /api/v1/health</div>
        <a class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" href="/api/v1/health" target="_blank">Test</a>
      </div>
      <div class="endpoint-row">
        <div><span class="method method-get">GET</span> /api/v1/subsets</div>
        <a class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" href="/api/v1/subsets" target="_blank">Test</a>
      </div>
      <div class="endpoint-row">
        <div><span class="method method-post">POST</span> /api/v1/predict/point</div>
        <span style="color: var(--text-muted); font-size: 13px;">90% & 95% Mondrian Bounds</span>
      </div>
      <div class="endpoint-row">
        <div><span class="method method-post">POST</span> /api/v1/evaluate/scenario</div>
        <span style="color: var(--text-muted); font-size: 13px;">Clopper-Pearson Risk Evaluation</span>
      </div>
      <div class="endpoint-row">
        <div><span class="method method-get">GET</span> /api/v1/stream/replay/FD001</div>
        <a class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" href="/api/v1/stream/replay/FD001?speed_ms=1000" target="_blank">Open SSE Stream</a>
      </div>
      <div class="endpoint-row">
        <div><span class="method method-post">POST</span> /api/v1/trust/validate</div>
        <span style="color: var(--text-muted); font-size: 13px;">Mahalanobis OOD & Stuck Sensor Gates</span>
      </div>
    </div>

    <div class="card">
      <h3>Live Engine Telemetry Stream Preview (FD001 Unit 1)</h3>
      <p>Streaming real-time cycles via Server-Sent Events (SSE):</p>
      <div id="sse-monitor" class="live-monitor">Connecting to SSE stream...</div>
    </div>
  </div>

  <script>
    const monitor = document.getElementById('sse-monitor');
    const evtSource = new EventSource('/api/v1/stream/replay/FD001?speed_ms=800');
    let count = 0;
    evtSource.onmessage = function(event) {{
      const d = JSON.parse(event.data);
      count++;
      const line = `[Cycle ${{d.cycle.toString().padStart(3, ' ')}}] Point RUL: ${{d.point_rul.toFixed(1)}} | 90% LB: ${{d.lower_bound_90.toFixed(1)}} | Health: ${{(d.health_index * 100).toFixed(0)}}% | Status: ${{d.status}}`;
      monitor.innerHTML = line + '<br>' + monitor.innerHTML;
      if (count > 8) {{
        const lines = monitor.innerHTML.split('<br>');
        monitor.innerHTML = lines.slice(0, 8).join('<br>');
      }}
    }};
    evtSource.onerror = function() {{
      monitor.innerHTML = '[SSE Stream active - waiting for next cycle tick...]';
    }};
  </script>
</body>
</html>"""
    return HTMLResponse(content=html_content)


@app.get("/api/v1/health")
async def health():
    """Health check endpoint confirming engine readiness and version."""
    return {"status": "ready", "version": "1.0.0"}


@app.get("/healthz")
def healthz():
    engines_count = len(FLEET_SERVICE.engines) if FLEET_SERVICE and hasattr(FLEET_SERVICE, "engines") else 0
    return {"ok": True, "subset": "FD002", "engines": engines_count}


@app.get("/v1/fleet/risk")
def v1_fleet_risk():
    if not FLEET_SERVICE:
        return []
    return FLEET_SERVICE.fleet_risk()


@app.get("/v1/engines/{eid}")
def v1_engine(eid: str):
    if not FLEET_SERVICE:
        raise HTTPException(status_code=503, detail="FleetService not initialized")
    r = FLEET_SERVICE.engine(eid)
    if r is None:
        raise HTTPException(status_code=404, detail="unknown engine")
    return r


@app.get("/v1/engines/{eid}/history")
def v1_engine_history(eid: str, n: int = 200):
    if not FLEET_SERVICE:
        return []
    return FLEET_SERVICE.history(eid, n)


@app.get("/v1/engines/{eid}/advice")
def v1_engine_advice(eid: str, cost_ratio: float = 1e-3):
    if not FLEET_SERVICE:
        raise HTTPException(status_code=503, detail="FleetService not initialized")
    a = FLEET_SERVICE.cost_advice(eid, cost_ratio)
    if a is None:
        raise HTTPException(status_code=404, detail="unknown engine")
    return a


@app.get("/v1/schedule")
def v1_schedule_get(n_slots: int = 8, capacity: int = 2, slot_len: int = 10):
    if not FLEET_SERVICE:
        return []
    return FLEET_SERVICE.schedule(n_slots, capacity, slot_len)


@app.post("/v1/schedule")
def v1_schedule_post(req: Dict[str, Any] = None):
    req = req or {}
    n_slots = req.get("n_slots", 8)
    capacity = req.get("capacity", 2)
    slot_len = req.get("slot_len", 10)
    if not FLEET_SERVICE:
        return []
    return FLEET_SERVICE.schedule(n_slots, capacity, slot_len)


@app.get("/v1/evidence/metrics")
def v1_metrics():
    if not FLEET_SERVICE:
        return {}
    return getattr(FLEET_SERVICE.b, "metrics", {})


@app.get("/api/v1/subsets")
async def get_subsets():
    """Lists available pre-trained C-MAPSS subsets."""
    available = list(BUNDLES.keys())
    if not available:
        available = ["FD001", "FD002", "FD003", "FD004"]
    return {"available": available}


@app.post("/api/v1/predict/point", response_model=RULResponse)
async def predict_point(payload: WindowTelemetry):
    """Generates RUL prediction bounded by 90% and 95% Mondrian conformal intervals."""
    subset = payload.subset or "FD002"
    if subset not in BUNDLES:
        if (ARTIFACTS_DIR / f"bundle_{subset}.pkl").exists():
            BUNDLES[subset] = load_bundle(subset)
        else:
            raise HTTPException(status_code=404, detail=f"Subset {subset} not found.")

    # 1. Trust Envelope Verification
    is_faulty, reasons, flags = verify_envelope(
        payload.sensor_readings,
        payload.operational_settings,
        payload.cycle,
        subset,
        payload.operational_settings_history
    )

    if is_faulty:
        return RULResponse(
            unit=payload.unit,
            cycle=payload.cycle,
            point_rul=0.0,
            lower_bound_90=0.0,
            lower_bound_95=0.0,
            health_index=0.0,
            status="ERROR",
            abstain=True,
            reasons=reasons or ["Sensor Fault Detected"]
        )

    # 2. Causal Feature Transformation & Inference
    p, lb90, lb95, thermo, attributions = run_inference_on_window(
        payload.operational_settings,
        payload.sensor_readings,
        payload.cycle,
        subset,
        payload.operational_settings_history
    )

    # Airworthiness status determination
    if lb90 <= 15:
        status_str = "CRITICAL"
    elif lb90 <= 30:
        status_str = "WARNING"
    else:
        status_str = "NORMAL"

    # Abstain if confidence interval widens beyond actionable threshold (> 60 cycles)
    interval_too_wide = (p - lb90) > 60.0
    abstain_flag = interval_too_wide or is_faulty
    if interval_too_wide:
        reasons.append("Conformal uncertainty interval exceeds actionable threshold (>60 cycles)")

    hi = compute_health_index(p, cap_rul=CAP_RUL)

    return RULResponse(
        unit=payload.unit,
        cycle=payload.cycle,
        point_rul=round(p, 2),
        lower_bound_90=round(lb90, 2),
        lower_bound_95=round(lb95, 2),
        health_index=round(hi, 3),
        status=status_str,
        abstain=abstain_flag,
        reasons=reasons,
        thermodynamics=thermo,
        attributions=attributions
    )


@app.post("/api/v1/evaluate/scenario", response_model=ScenarioEvaluationResponse)
async def evaluate_scenario(payload: ScenarioEvaluationRequest):
    """Evaluates maintenance trigger policy under Clopper-Pearson statistical risk control."""
    subset = payload.subset
    if subset not in BUNDLES:
        bundle_path = ARTIFACTS_DIR / f"bundle_{subset}.pkl"
        if bundle_path.exists():
            BUNDLES[subset] = load_bundle(subset)
        else:
            raise HTTPException(status_code=404, detail=f"Subset {subset} not found.")

    bundle = BUNDLES[subset]
    trajectories = bundle["trajectories"]

    fail_rate, mean_waste, summary = evaluate_trigger_policy(
        df_trajectories=trajectories,
        threshold=payload.threshold,
        lead=payload.lead,
        persist=payload.persist,
        lb_col="lb90"
    )

    return ScenarioEvaluationResponse(
        subset=subset,
        threshold=payload.threshold,
        lead=payload.lead,
        persist=payload.persist,
        total_units=summary["total_units"],
        failed_units=summary["failed_units"],
        failure_rate=summary["failure_rate"],
        mean_waste=summary["mean_wasted_cycles"],
        clopper_pearson_upper_90=summary["clopper_pearson_upper_90"]
    )


@app.post("/api/v1/trust/validate", response_model=TrustValidationResponse)
async def validate_trust(payload: RawTelemetryBatch):
    """Safety gate evaluating stuck sensors, spikes, and latent Mahalanobis OOD."""
    subset = payload.subset or "FD002"
    if subset not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{subset}.pkl").exists():
        BUNDLES[subset] = load_bundle(subset)

    bundle = BUNDLES.get(subset)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Subset {subset} not found.")

    df_window = pd.DataFrame(payload.sensor_readings)

    # Stuck sensors check
    stuck_sensors = []
    if len(df_window) >= 10:
        for s in df_window.columns:
            if s in KEEP_SENSORS or s.startswith("s"):
                if np.ptp(df_window[s].to_numpy()) == 0.0:
                    stuck_sensors.append(s)

    # OOD check
    is_faulty, reasons, flags = verify_envelope(
        payload.sensor_readings,
        payload.operational_settings,
        cycle=len(df_window),
        subset=subset
    )

    is_ood = any(f.get("metric") == "OOD_MAHALANOBIS" for f in flags)

    return TrustValidationResponse(
        ood=is_ood,
        stuck=stuck_sensors,
        abstain=is_faulty,
        reasons=reasons
    )


# ==========================================
# Server-Sent Events (SSE) Live Replay
# ==========================================

@app.get("/api/v1/stream/replay/{subset}")
async def replay_telemetry(
    subset: str,
    speed_ms: int = Query(500, description="Delay between cycle events in milliseconds"),
    loop: bool = Query(False, description="Whether to loop the stream upon reaching end of trajectory"),
    unit: Optional[int] = Query(None, description="Specific engine unit to replay (defaults to first test unit)")
):
    """Streams real-time turbofan degradation telemetry via Server-Sent Events (SSE)."""
    if subset not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{subset}.pkl").exists():
        BUNDLES[subset] = load_bundle(subset)

    bundle = BUNDLES.get(subset)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Subset {subset} not found.")

    test_raw: pd.DataFrame = bundle["test_raw"]
    target_unit = unit if unit is not None else int(test_raw["unit"].iloc[0])
    df_unit = test_raw[test_raw["unit"] == target_unit].sort_values("cycle")

    if len(df_unit) == 0:
        raise HTTPException(status_code=404, detail=f"Unit {target_unit} not found in {subset}.")

    delay_seconds = max(0.01, speed_ms / 1000.0)

    async def event_generator():
        while True:
            # Maintain trailing rolling buffer
            buffer: Dict[str, List[float]] = {s: [] for s in KEEP_SENSORS}
            op_buffer = []

            for _, row in df_unit.iterrows():
                cyc = int(row["cycle"])
                op = [float(row["op1"]), float(row["op2"]), float(row["op3"])]
                op_buffer.append(op)

                for s in KEEP_SENSORS:
                    buffer[s].append(float(row[s]))

                # Keep buffer capped at 30 cycles
                if len(buffer[KEEP_SENSORS[0]]) > 30:
                    for s in KEEP_SENSORS:
                        buffer[s] = buffer[s][-30:]
                    op_buffer = op_buffer[-30:]

                # Execute inference on current window
                try:
                    p, lb90, lb95, thermo, attributions = run_inference_on_window(
                        operational_settings=op,
                        sensor_readings=buffer,
                        cycle=cyc,
                        subset=subset
                    )
                    status_str = "CRITICAL" if lb90 <= 15 else ("WARNING" if lb90 <= 30 else "NORMAL")
                    abstain = (p - lb90 > 60.0)
                except Exception as e:
                    p, lb90, lb95 = 0.0, 0.0, 0.0
                    status_str = "ERROR"
                    abstain = True
                    thermo, attributions = {}, {}

                tick_data = {
                    "unit": target_unit,
                    "cycle": cyc,
                    "operational_settings": op,
                    "point_rul": round(p, 2),
                    "lower_bound_90": round(lb90, 2),
                    "lower_bound_95": round(lb95, 2),
                    "health_index": round(compute_health_index(p, cap_rul=CAP_RUL), 3),
                    "status": status_str,
                    "abstain": abstain,
                    "sensors": {s: round(float(row[s]), 4) for s in KEEP_SENSORS},
                    "thermodynamics": thermo,
                    "attributions": attributions
                }

                yield {
                    "data": json.dumps(tick_data)
                }

                await asyncio.sleep(delay_seconds)

            if not loop:
                break

    return EventSourceResponse(event_generator())


# ==========================================
# VISION 2.0: Fleet, Decision, and Multimodal APIs
# ==========================================

FLEET_OVERVIEW_CACHE: Dict[str, Dict[str, Any]] = {}


@app.get("/api/v1/fleet/overview")
async def get_fleet_overview(subset: str = Query("FD001", description="C-MAPSS fleet subset")):
    """Retrieves fleet-wide prognostics overview, risk ranking, and assigned hangar bays."""
    sub = subset.upper()
    if sub in FLEET_OVERVIEW_CACHE:
        return FLEET_OVERVIEW_CACHE[sub]

    if sub not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{sub}.pkl").exists():
        BUNDLES[sub] = load_bundle(sub)
    bundle = BUNDLES.get(sub)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Subset {sub} bundle not loaded.")

    test_raw: pd.DataFrame = bundle["test_raw"]
    last_idx = test_raw.groupby("unit").tail(1).index
    last_rows = test_raw.loc[last_idx].sort_values("unit")

    engines_list = []
    crit_count = 0
    mon_count = 0
    healthy_count = 0

    # Evaluate last cycle features with pre-trained LightGBM and Mondrian tables
    df_norm = bundle["normalizer"].transform(test_raw)
    df_feats = compute_causal_features(df_norm)
    feat_cols = bundle["feat_cols"]
    X_last = df_feats.loc[last_idx][feat_cols]

    preds = bundle["model"].predict(X_last)
    calib_90 = bundle["calib_90"]
    calib_95 = bundle["calib_95"]

    bay_names = ["Bay A (Heavy Overhaul)", "Bay B (Hot Section & Borescope)", "Bay C (Line Maintenance)"]

    for i in range(len(last_rows)):
        u = int(last_rows.iloc[i]["unit"])
        cyc = int(last_rows.iloc[i]["cycle"])
        p_raw = float(preds[i])
        p, lb90, lb95 = predict_dual_bounds(p_raw, calib_90, calib_95)
        hi = round(compute_health_index(p, cap_rul=CAP_RUL), 3)
        risk = round(1.0 - hi, 3)

        if lb90 <= 15:
            urgency = "CRITICAL"
            crit_count += 1
        elif lb90 <= 40:
            urgency = "MONITOR"
            mon_count += 1
        else:
            urgency = "HEALTHY"
            healthy_count += 1

        engines_list.append({
            "unit_id": u,
            "current_cycle": cyc,
            "predicted_rul": round(p, 1),
            "lower_bound_90": round(lb90, 1),
            "upper_bound_90": round(p + (p - lb90), 1),
            "health_index": hi,
            "risk_score": risk,
            "urgency_level": urgency,
            "assigned_bay": None,
        })

    # Sort descending by risk
    engines_list.sort(key=lambda e: (-e["risk_score"], e["lower_bound_90"]))

    # Assign hangar bays to top 3 urgent units
    allocated_bays = []
    for idx, eng in enumerate(engines_list):
        if eng["urgency_level"] in ("CRITICAL", "MONITOR") and len(allocated_bays) < len(bay_names):
            bay_name = bay_names[len(allocated_bays)]
            eng["assigned_bay"] = bay_name
            allocated_bays.append({
                "bay_id": f"BAY-{len(allocated_bays) + 1}",
                "bay_name": bay_name,
                "unit_id": eng["unit_id"],
                "urgency": eng["urgency_level"],
                "predicted_rul": eng["predicted_rul"],
                "target_cycle": eng["current_cycle"] + 15,
            })

    result = {
        "subset": sub,
        "total_engines": len(engines_list),
        "critical_count": crit_count,
        "monitor_count": mon_count,
        "healthy_count": healthy_count,
        "engines": engines_list,
        "allocated_bays": allocated_bays,
        "meta": {"data_mode": "EMPIRICAL", "provenance": "NASA Ames C-MAPSS", "synthetic": False},
    }

    FLEET_OVERVIEW_CACHE[sub] = result
    return result


@app.get("/api/v1/engine/{unit_id}")
async def get_engine_telemetry(unit_id: int, subset: str = Query("FD001")):
    """Retrieves full multi-cycle sensor history and alerts for an individual engine."""
    sub = subset.upper()
    if sub not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{sub}.pkl").exists():
        BUNDLES[sub] = load_bundle(sub)
    bundle = BUNDLES.get(sub)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Subset {sub} not loaded.")

    test_raw: pd.DataFrame = bundle["test_raw"]
    df_u = test_raw[test_raw["unit"] == unit_id].sort_values("cycle")
    if len(df_u) == 0:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found in {sub}.")

    readings = []
    for _, r in df_u.iterrows():
        cyc = int(r["cycle"])
        sens = {s: float(r[s]) for s in KEEP_SENSORS if s in r}
        ops = {"op1": float(r["op1"]), "op2": float(r["op2"]), "op3": float(r["op3"])}
        readings.append({"cycle": cyc, "sensors": sens, "operational_settings": ops, "regime": 0})

    last_row = df_u.iloc[-1]
    last_cycle = int(last_row["cycle"])
    last_sensors = {s: float(last_row[s]) for s in KEEP_SENSORS if s in last_row}
    last_ops = {"op1": float(last_row["op1"]), "op2": float(last_row["op2"]), "op3": float(last_row["op3"])}

    window_rows = df_u.tail(30)
    buf = {s: list(window_rows[s].astype(float)) for s in KEEP_SENSORS}
    op_list = [float(last_ops["op1"]), float(last_ops["op2"]), float(last_ops["op3"])]
    p, lb90, lb95, thermo, attributions = run_inference_on_window(
        operational_settings=op_list,
        sensor_readings=buf,
        cycle=last_cycle,
        subset=sub
    )

    alerts = []
    if lb90 <= 15:
        alerts.append("CRITICAL: Conformal 90% LB breached maintenance trigger threshold (<= 15c)")
    elif lb90 <= 30:
        alerts.append("ADVISORY: Conformal lower bound approaching lead-time horizon (<= 30c)")
    if p - lb90 > 60:
        alerts.append("UNCONFIRMED: Epistemic variance exceeds actionable confidence interval")

    urgency = "CRITICAL" if lb90 <= 15 else ("MONITOR" if lb90 <= 40 else "HEALTHY")

    return {
        "unit_id": unit_id,
        "subset": sub,
        "current_cycle": last_cycle,
        "total_cycles": len(df_u),
        "operational_settings": last_ops,
        "latest_sensors": last_sensors,
        "sensor_history": readings,
        "alerts": alerts,
        "predicted_rul": round(p, 1),
        "conformal_lower_90": round(lb90, 1),
        "conformal_upper_90": round(p + (p - lb90), 1),
        "health_index": round(compute_health_index(p, cap_rul=CAP_RUL), 3),
        "urgency": urgency,
        "thermodynamics": thermo,
        "attributions": attributions,
        "meta": {"data_mode": "EMPIRICAL", "provenance": "NASA Ames C-MAPSS"},
    }


@app.get("/api/v1/engine/{unit_id}/replay")
async def get_engine_replay_trajectory(unit_id: int, subset: str = Query("FD001")):
    """Retrieves structured sequence trajectory for 3D digital twin animation replay."""
    sub = subset.upper()
    if sub not in BUNDLES and (ARTIFACTS_DIR / f"bundle_{sub}.pkl").exists():
        BUNDLES[sub] = load_bundle(sub)
    bundle = BUNDLES.get(sub)
    if not bundle:
        raise HTTPException(status_code=404, detail=f"Subset {sub} not loaded.")

    test_raw: pd.DataFrame = bundle["test_raw"]
    df_u = test_raw[test_raw["unit"] == unit_id].sort_values("cycle")
    if len(df_u) == 0:
        raise HTTPException(status_code=404, detail=f"Unit {unit_id} not found in {sub}.")

    frames = []
    for _, r in df_u.iterrows():
        frames.append({
            "cycle": int(r["cycle"]),
            "fan_speed": float(r.get("s8", 2388.0)),
            "core_speed": float(r.get("s9", 9050.0)),
            "hpc_temp_T30": float(r.get("s3", 1588.0)),
            "lpt_temp_T50": float(r.get("s4", 1405.0)),
            "hpc_pressure_P30": float(r.get("s7", 553.0)),
            "fuel_flow_ratio": float(r.get("s12", 521.8)),
            "bypass_ratio": float(r.get("s15", 8.42)),
            "coolant_bleed_W31": float(r.get("s20", 38.9)),
        })

    return {
        "unit_id": unit_id,
        "subset": sub,
        "total_cycles": len(df_u),
        "current_cycle": int(df_u.iloc[-1]["cycle"]),
        "frames": frames,
    }


@app.post("/api/v1/decision/optimize")
async def optimize_decision(payload: MaintenanceOptimizationPayload):
    """Executes economic cost-loss optimization on fleet engines."""
    overview = await get_fleet_overview(payload.subset)
    engines = overview["engines"]
    return decision_service.optimize_fleet_decisions(
        engines_data=engines,
        cost_failure=payload.cost_failure,
        cost_waste_per_cycle=payload.cost_waste_per_cycle,
        lead_time=payload.lead_time,
        risk_budget_eps=payload.risk_budget_eps,
        subset=payload.subset
    )


@app.get("/api/v1/decision/policy")
async def get_decision_policy(subset: str = Query("FD001")):
    """Returns precomputed policy comparison benchmarks."""
    overview = await get_fleet_overview(subset)
    engines = overview["engines"]
    res = decision_service.optimize_fleet_decisions(engines_data=engines, subset=subset)
    return {
        "subset": subset,
        "benchmarks": res["policy_benchmarks"],
        "cost_parameters": res["cost_parameters"],
        "allocated_bays": res["allocated_bays"],
    }


# --- Non-Sensor Intelligence Routes ---

@app.get("/api/v1/oil/{unit_id}")
async def get_oil_intelligence(unit_id: int):
    """Returns spectrographic oil reports and wear trend analysis."""
    reports = oil_service.get_reports(unit_id)
    trends = oil_service.detect_wear_trends(unit_id)
    return {
        "unit_id": unit_id,
        "reports": reports,
        "wear_trend_analysis": trends,
    }


@app.post("/api/v1/oil/{unit_id}/upload")
async def upload_oil_report(unit_id: int, payload: Dict[str, Any]):
    """Accepts uploaded spectrographic oil test data."""
    return oil_service.add_report(unit_id, payload)


@app.get("/api/v1/inspection/{unit_id}")
async def get_visual_inspections(unit_id: int):
    """Returns borescope records, defect list, and inspection summary."""
    inspections = inspection_service.get_inspections(unit_id)
    summary = inspection_service.get_summary(unit_id)
    return {
        "unit_id": unit_id,
        "inspections": inspections,
        "summary": summary,
    }


@app.post("/api/v1/inspection/{unit_id}")
async def record_visual_inspection(unit_id: int, payload: Dict[str, Any]):
    """Records new borescope finding."""
    return inspection_service.add_inspection(unit_id, payload)


@app.get("/api/v1/maintenance/{unit_id}")
async def get_maintenance_history(unit_id: int):
    """Returns maintenance logs and chronic repeated defect detection."""
    logs = maintenance_service.get_logs(unit_id)
    repeated = maintenance_service.detect_repeated_faults(unit_id)
    return {
        "unit_id": unit_id,
        "logs": logs,
        "repeated_faults": repeated,
    }


@app.post("/api/v1/maintenance/{unit_id}")
async def add_maintenance_log(unit_id: int, payload: Dict[str, Any]):
    """Appends a maintenance work order entry."""
    return maintenance_service.add_log(unit_id, payload)


@app.get("/api/v1/aircraft/{unit_id}/systems")
async def get_aircraft_systems(unit_id: int):
    """Returns Fuel, Hydraulics, Electrical, APU, Landing Gear, Flight ops, and Structural fatigue."""
    return aircraft_systems_service.get_aircraft_status(unit_id)


@app.get("/api/v1/fusion/{unit_id}")
async def get_multimodal_fusion(unit_id: int, subset: str = Query("FD001")):
    """Executes 8-channel multimodal health fusion for an aircraft engine."""
    # Obtain latest telemetry if engine is loaded
    try:
        telemetry = await get_engine_telemetry(unit_id, subset=subset)
    except Exception:
        telemetry = None

    return fusion_engine.fuse_aircraft_health(
        unit_id=unit_id,
        telemetry_tick=telemetry,
        subset=subset
    )


@app.get("/api/v1/graph/nodes")
async def get_knowledge_graph_nodes():
    """Returns full relational graph nodes and edges."""
    return knowledge_graph_service.get_full_graph()


@app.post("/api/v1/graph/query")
async def query_knowledge_graph(payload: GraphQueryPayload):
    """Executes multi-hop traversal query on aircraft knowledge graph."""
    return knowledge_graph_service.query_relationships(
        query_type=payload.query,
        entity_id=payload.entity_id
    )
