"""Replay official test engines into the running API, one cycle per engine per tick. python scripts/stream_replay.py --subset 1 --engines 20 --tick 0.2"""
import argparse, time, httpx
from vision_phm.data import load
from vision_phm import config as C

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--subset", type=int, default=1)
    ap.add_argument("--engines", type=int, default=20)
    ap.add_argument("--tick", type=float, default=0.2)
    ap.add_argument("--url", default="http://localhost:8000")
    a = ap.parse_args()
    _, te, _ = load(a.subset)
    units = sorted(te.unit.unique())[:a.engines]
    g = {u: te[te.unit == u].reset_index(drop=True) for u in units}
    T = max(len(v) for v in g.values())
    print(f"Replaying {len(units)} engines from subset FD00{a.subset} into {a.url}...")
    with httpx.Client(base_url=a.url, timeout=10) as cl:
        for t in range(T):
            for u in units:
                if t < len(g[u]):
                    r = g[u].iloc[t]
                    try:
                        cl.post("/v1/ingest", json={"engine_id": f"E{u}", "cycle": int(r.cycle), "op": [r.op1, r.op2, r.op3],
                                                     "sensors": [float(r[f"s{i}"]) for i in range(1, 22)]})
                    except Exception as e:
                        print(f"Error at cycle {r.cycle}: {e}")
            time.sleep(a.tick)

if __name__ == "__main__":
    main()

