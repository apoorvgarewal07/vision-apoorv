"""L5 fleet layer (greedy EDF slot assignment). CP-SAT/MILP upgrade path: same inputs, add spares/lead-time constraints."""
from dataclasses import dataclass

@dataclass
class Job:
    engine_id: str
    due_cycle: int  # latest acceptable removal cycle (trigger cycle + LEAD, or LB-based deadline)
    now_cycle: int

def assign_slots(jobs, n_slots=8, capacity=2, slot_len=10, start=0):
    """Slots open at start + i*slot_len (in 'cycles from now'). Earliest-deadline-first; flags engines whose slot is after deadline."""
    jobs = sorted(jobs, key=lambda j: j.due_cycle - j.now_cycle)
    load = [0] * n_slots; plan = []
    for j in jobs:
        slack = j.due_cycle - j.now_cycle
        placed = None
        for i in range(n_slots):
            if load[i] < capacity: placed = i; break
        if placed is None:
            plan.append({"engine_id": j.engine_id, "slot": None, "at_risk": True, "slack": slack}); continue
        load[placed] += 1; t = start + placed * slot_len
        plan.append({"engine_id": j.engine_id, "slot": placed, "slot_start_in": t, "slack": slack, "at_risk": t > slack})
    return plan

