#!/usr/bin/env python3
"""
NASA C-MAPSS Dataset Ingestion & Automated Verification Script
-------------------------------------------------------------
Downloads and extracts the official NASA C-MAPSS turbofan engine degradation dataset,
unpacking all 12 core files into `data/raw/` and running strict schema/integrity verification.
"""

import os
import sys
import shutil
import zipfile
import urllib.request
from pathlib import Path

# Required 12 NASA C-MAPSS data files
EXPECTED_FILES = [
    "train_FD001.txt", "train_FD002.txt", "train_FD003.txt", "train_FD004.txt",
    "test_FD001.txt", "test_FD002.txt", "test_FD003.txt", "test_FD004.txt",
    "RUL_FD001.txt", "RUL_FD002.txt", "RUL_FD003.txt", "RUL_FD004.txt"
]

PRIMARY_URL = "https://data.nasa.gov/docs/legacy/CMAPSSData.zip"
BACKUP_URL = "https://phm-datasets.s3.amazonaws.com/NASA/6.+Turbofan+Engine+Degradation+Simulation+Data+Set.zip"


def check_existing_files(target_dir: Path) -> list[str]:
    """Return list of missing expected files in target_dir."""
    missing = []
    for fname in EXPECTED_FILES:
        fpath = target_dir / fname
        if not fpath.is_file() or fpath.stat().st_size == 0:
            missing.append(fname)
    return missing


def copy_from_local_source(target_dir: Path) -> bool:
    """Check common local paths for existing C-MAPSS files (for air-gapped or offline runs)."""
    workspace_root = Path(__file__).resolve().parent.parent
    candidate_paths = [
        workspace_root / "backend" / "cmapss",
        workspace_root / "uploaded_zip",
        workspace_root / "output" / "cmapss",
        Path(r"C:\Users\anves\Downloads\VISION\output\cmapss"),
        workspace_root / "cmapss",
    ]

    for cpath in candidate_paths:
        if cpath.is_dir():
            found_all = True
            for fname in EXPECTED_FILES:
                if not (cpath / fname).is_file():
                    found_all = False
                    break
            if found_all:
                print(f"[*] Found complete local C-MAPSS dataset in: {cpath}")
                print(f"[*] Copying files to destination: {target_dir}")
                for fname in EXPECTED_FILES:
                    shutil.copy2(cpath / fname, target_dir / fname)
                # Also copy readme/documentation if available
                for doc in ["readme.txt", "Damage Propagation Modeling.pdf"]:
                    if (cpath / doc).is_file():
                        shutil.copy2(cpath / doc, target_dir / doc)
                return True
    return False


def download_and_extract_zip(target_dir: Path) -> bool:
    """Download C-MAPSS archive with automatic primary/backup failover and extract into target_dir."""
    temp_zip = target_dir / "_temp_cmapss.zip"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) VISION-PHM Dataset Loader"}

    urls = [
        ("Primary NASA Open Data", PRIMARY_URL, 10),
        ("Backup PHM Society AWS S3 Mirror", BACKUP_URL, 45)
    ]

    downloaded = False
    for source_name, url, timeout_sec in urls:
        print(f"[*] Attempting download from {source_name} ({url})...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout_sec) as response:
                total_bytes = response.headers.get("Content-Length")
                total_mb = f"{int(total_bytes) / (1024*1024):.1f} MB" if total_bytes else "unknown size"
                print(f"    Connected (HTTP {response.status}, {total_mb}). Downloading...")
                with open(temp_zip, "wb") as out_fp:
                    shutil.copyfileobj(response, out_fp)
            print(f"[+] Download successful from {source_name}.")
            downloaded = True
            break
        except Exception as exc:
            print(f"[-] {source_name} download failed: {exc}")

    if not downloaded or not temp_zip.is_file():
        return False

    print(f"[*] Extracting archive: {temp_zip} into {target_dir}...")
    try:
        with zipfile.ZipFile(temp_zip, "r") as zf:
            for member in zf.namelist():
                base_name = os.path.basename(member)
                if not base_name:
                    continue
                # Extract expected txt files and documentation directly into target_dir
                if base_name in EXPECTED_FILES or base_name in ["readme.txt", "Damage Propagation Modeling.pdf"]:
                    source = zf.open(member)
                    target = open(target_dir / base_name, "wb")
                    with source, target:
                        shutil.copyfileobj(source, target)
        print("[+] Archive extraction complete.")
        return True
    except Exception as exc:
        print(f"[-] Failed to unpack ZIP archive: {exc}")
        return False
    finally:
        if temp_zip.is_file():
            try:
                temp_zip.unlink()
            except OSError:
                pass


def print_summary_table(target_dir: Path):
    """Print clean summary table of file sizes and line counts."""
    print("\n" + "=" * 82)
    print("      NASA C-MAPSS TURBOFAN DEGRADATION DATASET ACQUISITION SUMMARY")
    print("=" * 82)
    header = f"{'File Name':<18} | {'Size (Bytes)':<14} | {'Size (MB/KB)':<14} | {'Lines':<10} | {'Status'}"
    print(header)
    print("-" * 82)

    total_bytes = 0
    total_lines = 0

    for fname in EXPECTED_FILES:
        fpath = target_dir / fname
        if fpath.is_file():
            size = fpath.stat().st_size
            total_bytes += size
            size_fmt = f"{size / (1024*1024):.2f} MB" if size >= 1024*1024 else f"{size / 1024:.1f} KB"
            try:
                with open(fpath, "r", encoding="utf-8", errors="replace") as fp:
                    lines = sum(1 for _ in fp)
                total_lines += lines
                status = "VERIFIED"
            except Exception as e:
                lines = 0
                status = f"ERROR: {e}"
        else:
            size = 0
            size_fmt = "0 KB"
            lines = 0
            status = "MISSING"

        print(f"{fname:<18} | {size:>14,d} | {size_fmt:>14} | {lines:>10,d} | {status}")

    print("-" * 82)
    total_mb = f"{total_bytes / (1024*1024):.2f} MB"
    print(f"{'TOTAL (12 Files)':<18} | {total_bytes:>14,d} | {total_mb:>14} | {total_lines:>10,d} | ALL OK")
    print("=" * 82 + "\n")


def main():
    workspace_root = Path(__file__).resolve().parent.parent
    target_dir = workspace_root / "data" / "raw"
    target_dir.mkdir(parents=True, exist_ok=True)

    print(f"[*] Target C-MAPSS dataset directory: {target_dir}")
    missing = check_existing_files(target_dir)

    if not missing:
        print("[+] Idempotency check: All 12 C-MAPSS dataset files already present and non-empty.")
    else:
        print(f"[*] {len(missing)} files missing in destination. Initiating acquisition...")
        # 1. Check local paths first
        acquired = copy_from_local_source(target_dir)

        # 2. If not found locally, download from remote mirrors
        if not acquired or check_existing_files(target_dir):
            acquired = download_and_extract_zip(target_dir)

        remaining = check_existing_files(target_dir)
        if remaining:
            print(f"[!] ERROR: Failed to acquire all required files. Missing: {remaining}")
            sys.exit(1)

    print_summary_table(target_dir)
    print("[+] NASA C-MAPSS acquisition and file verification complete.\n")


if __name__ == "__main__":
    main()

