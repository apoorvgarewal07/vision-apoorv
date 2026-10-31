"""Framework-independent serving core: per-engine state, streaming inference, decision logic, audit trail."""
import json, hashlib, time, threading
from collections import deque
import numpy as np, pandas as pd
from scipy.stats import norm as _norm
from . import config as C
from .data import feats_last, feature_names
from .trust import sensor_faults
from .risk import optimal_removal_cycle
from .scheduler import Job, assign_slots
OP_COLS = ["op1", "op2", "op3"]

class Audit:
    """Append-only hash-chained JSONL log for reproducibility / learning-assurance evidence."""
    def __init__(self, path=None): self.path = path; self.prev = "0" * 64; self.lock = threading.Lock()
    def write(self, rec):
        with self.lock:
            rec = {**rec, "ts": time.time(), "prev": self.prev}
            s = json.dumps(rec, sort_keys=True, default=float); self.prev = hashlib.sha256(s.encode()).hexdigest()
            if self.path:
                with open(self.path, "a") as f: f.write(s + "\n")

class Engine:
    def __init__(self, eid):
        self.id = eid; self.raw = deque(maxlen=C.WINDOW); self.norm = deque(maxlen=C.WINDOW)
        self.last_cycle = -1; self.run = 0; self.trigger_cycle = None; self.hist = deque(maxlen=2000); self.last = None

class FleetService:
    def __init__(self, bundle, policy="lower_persist3", audit_path=None):
        self.b = bundle; self.policy = policy; self.engines = {}; self.lock = threading.Lock(); self.audit = Audit(audit_path)
        th = (bundle.thresholds or {}).get(policy)
        if th is None:
            for alt in ("lower", "point", "fixed"):
                th = (bundle.thresholds or {}).get(alt)
                if th is not None:
                    self.policy = alt
                    break
        if th is None: raise RuntimeError(f"no feasible risk-controlled threshold for policy {policy}; retrain or relax eps")
        self.theta = th["theta"]

    def ingest(self, eid, cycle, op, sensors21):
        """op: 3 floats; sensors21: 21 floats (s1..s21). Raises ValueError on out-of-order cycles."""
        with self.lock:
            e = self.engines.setdefault(eid, Engine(eid))
            if cycle <= e.last_cycle: raise ValueError(f"cycle {cycle} <= last seen {e.last_cycle}")
            row = {c: v for c, v in zip(C.COLS[2:], list(op) + list(sensors21))}
            df = self.b.normalizer.transform(pd.DataFrame([{"unit": 0, "cycle": cycle, **row}]))
            e.raw.append(np.array([row[s] for s in C.KEEP])) # raw kept for stuck-sensor check
            e.norm.append(df[C.KEEP].values[0]); e.last_cycle = cycle
            res = self._decide(e, cycle, int(df["reg"].iloc[0]))
            e.last = res; e.hist.append(res)
            self.audit.write({"engine": eid, "cycle": cycle, "status": res["status"], "rul": res["rul"], "lb": res["lb90"]})
            return res

    def _decide(self, e, cycle, regime):
        W = np.vstack(e.norm); x = feats_last(W, cycle)
        p = float(np.clip(self.b.model.predict(pd.DataFrame([x], columns=feature_names()))[0], 0, C.CAP))
        lo, hi = self.b.calibrator.interval(p, C.SERVE_ALPHA); lb = float(self.b.calibrator.lower(p, C.SERVE_ALPHA)[0])
        width = float(hi[0] - lo[0]); sigma = width / 2 / 1.645
        p_fail = float(_norm.cdf((C.LEAD - p) / max(sigma, 1e-6))) # Gaussian approx of calibrated spread
        flags = sensor_faults(np.vstack(e.raw), W)
        ood = self.b.ood.is_ood(W[-1])
        abstain = bool(flags) or ood or width > C.MAX_INTERVAL_WIDTH
        ok = (lb <= self.theta) if self.policy.startswith("lower") else (p <= self.theta)
        e.run = e.run + 1 if ok and not abstain else 0
        need = C.PERSIST if self.policy == "lower_persist3" else 1
        if e.trigger_cycle is None and e.run >= need: e.trigger_cycle = cycle
        status = "ABSTAIN" if abstain else ("TRIGGERED" if e.trigger_cycle is not None else ("WATCH" if p_fail > 0.01 else "OK"))
        due = e.trigger_cycle + C.LEAD if e.trigger_cycle is not None else None
        if C.LLP_CYCLES is not None: # hard-life guard always wins
            llp_due = C.LLP_CYCLES
            if due is None or llp_due < due: due = llp_due
            if cycle >= llp_due - C.LEAD: status = "LLP_LIMIT"
        return {"engine_id": e.id, "cycle": cycle, "regime": regime, "rul": round(p, 2), "lo90": round(float(lo[0]), 2),
                "hi90": round(float(hi[0]), 2), "lb90": round(lb, 2), "interval_width": round(width, 2),
                "p_fail_within_lead": round(p_fail, 4), "status": status, "trigger_cycle": e.trigger_cycle,
                "recommended_removal_cycle": due, "abstain_reasons": flags + (["ood"] if ood else []) +
                (["wide_interval"] if width > C.MAX_INTERVAL_WIDTH else []), "policy": self.policy, "theta": self.theta}

    def engine(self, eid):
        e = self.engines.get(eid); return None if e is None else e.last

    def history(self, eid, n=200):
        e = self.engines.get(eid); return [] if e is None else list(e.hist)[-n:]

    def fleet_risk(self):
        rows = [e.last for e in self.engines.values() if e.last]
        return sorted(rows, key=lambda r: (-r["p_fail_within_lead"], r["rul"]))

    def cost_advice(self, eid, cost_ratio):
        r = self.engine(eid)
        if r is None: return None
        sigma = r["interval_width"] / 2 / 1.645
        k = optimal_removal_cycle(r["rul"], sigma, r["cycle"], cost_ratio)
        return {"engine_id": eid, "cost_ratio": cost_ratio, "remove_in_cycles": k,
                "note": "Gaussian approximation of calibrated spread; hazard threshold = c_w/C_f"}

    def schedule(self, n_slots=8, capacity=2, slot_len=10):
        jobs = [Job(r["engine_id"], r["recommended_removal_cycle"], r["cycle"]) for r in self.fleet_risk()
                if r["recommended_removal_cycle"] is not None]
        return assign_slots(jobs, n_slots, capacity, slot_len)

