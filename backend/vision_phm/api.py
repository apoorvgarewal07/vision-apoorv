"""FastAPI surface. Run: uvicorn vision_phm.api:app --port 8000 (needs artifacts from `python -m vision_phm.train`)."""
import json, os
from contextlib import asynccontextmanager
from typing import List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from . import config as C, bundle as B
from .service import FleetService

state = {}

class Reading(BaseModel):
    engine_id: str
    cycle: int = Field(ge=1)
    op: List[float] = Field(min_length=3, max_length=3)
    sensors: List[float] = Field(min_length=21, max_length=21)

class ScheduleReq(BaseModel):
    n_slots: int = 8
    capacity: int = 2
    slot_len: int = 10

@asynccontextmanager
async def lifespan(app):
    bun = B.load(C.SUBSET, C.ART_DIR)
    state["svc"] = FleetService(bun, audit_path=os.environ.get("AUDIT_LOG", "audit.jsonl"))
    yield

app = FastAPI(title="VISION-PHM backend", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/healthz")
def healthz(): 
    count = len(state["svc"].engines) if "svc" in state and hasattr(state["svc"], "engines") else 0
    return {"ok": True, "subset": C.SUBSET, "engines": count}

@app.post("/v1/ingest")
def ingest(r: Reading):
    try: return state["svc"].ingest(r.engine_id, r.cycle, r.op, r.sensors)
    except ValueError as e: raise HTTPException(409, str(e))

@app.get("/v1/fleet/risk")
def fleet_risk(): return state["svc"].fleet_risk()

@app.get("/v1/engines/{eid}")
def engine(eid: str):
    r = state["svc"].engine(eid)
    if r is None: raise HTTPException(404, "unknown engine")
    return r

@app.get("/v1/engines/{eid}/history")
def history(eid: str, n: int = 200): return state["svc"].history(eid, n)

@app.get("/v1/engines/{eid}/advice")
def advice(eid: str, cost_ratio: float = 1e-3):
    a = state["svc"].cost_advice(eid, cost_ratio)
    if a is None: raise HTTPException(404, "unknown engine")
    return a

@app.post("/v1/schedule")
def schedule(req: ScheduleReq): return state["svc"].schedule(req.n_slots, req.capacity, req.slot_len)

@app.get("/v1/evidence/metrics")
def metrics(): return state["svc"].b.metrics
