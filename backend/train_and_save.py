"""Train all C-MAPSS subsets and save artifacts."""

import time
from pipeline import train_subset, save_bundle
from config import REGIME_CLUSTERS

if __name__ == "__main__":
    t_start = time.time()
    print("Beginning VISION-PHM fleet training across all subsets...")

    for subset in ["FD001", "FD002", "FD003", "FD004"]:
        t0 = time.time()
        print(f"\n==================== {subset} ====================")
        bundle = train_subset(subset)
        save_bundle(bundle)
        print(f"[{subset}] Completed in {time.time() - t0:.1f}s")

    print(f"\nAll models successfully trained and serialized in {time.time() - t_start:.1f}s!")

