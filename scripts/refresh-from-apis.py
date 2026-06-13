#!/usr/bin/env python3
"""Fetch Culm metrics from sources with stable CSV/ZIP downloads. Run: npm run refresh:apis"""

from __future__ import annotations

import csv
import io
import json
import sys
import tempfile
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src/data/auto/epoch-metrics.json"

EPOCH_CHIP_SALES = "https://epoch.ai/data/ai_chip_sales.zip"
EPOCH_GPU_CLUSTERS = "https://epoch.ai/data/gpu_clusters.csv"
USER_AGENT = "Culm/0.1 (+https://github.com/prismaticlabs/culm; data refresh script)"
REQUEST_TIMEOUT = 60
SHARE_SUM_TOLERANCE = 0.01


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT) as resp:
        return resp.read()


def hhi(shares: list[float]) -> float:
    return sum((s * 100) ** 2 for s in shares)


def assert_shares_valid(label: str, shares: dict[str, float]) -> None:
    if not shares:
        raise ValueError(f"{label}: no share rows parsed")
    for name, share in shares.items():
        if not 0 <= share <= 1:
            raise ValueError(f"{label}: share for {name!r} out of range [0,1]: {share}")
    total = sum(shares.values())
    if abs(total - 1.0) > SHARE_SUM_TOLERANCE:
        raise ValueError(f"{label}: designer shares sum to {total:.4f}, expected ~1.0")


def latest_end_date(rows: list[dict[str, str]]) -> str:
    dates = sorted({row["End date"] for row in rows if row.get("End date")})
    if not dates:
        raise ValueError("chip sales CSV has no End date values")
    return dates[-1]


def chip_designer_shares() -> dict:
    raw = fetch_bytes(EPOCH_CHIP_SALES)
    with zipfile.ZipFile(io.BytesIO(raw)) as zf:
        text = zf.read("cumulative_timelines_by_designer.csv").decode("utf-8")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise ValueError("chip sales CSV is empty")

    end_date = latest_end_date(rows)
    by_designer: dict[str, float] = {}
    for row in rows:
        if row["End date"] != end_date:
            continue
        if "total" not in row["Name"]:
            continue
        by_designer[row["Chip manufacturer"]] = float(row["Compute estimate in H100e (median)"])

    total = sum(by_designer.values())
    if total <= 0:
        raise ValueError("chip sales compute total must be > 0")
    normalized = {d: v / total for d, v in by_designer.items()}
    assert_shares_valid("aiAccelerators", normalized)

    shares = sorted(normalized.values(), reverse=True)
    return {
        "asOf": end_date[:7] if len(end_date) >= 7 else end_date,
        "metric": "cumulative H100e share by chip designer",
        "designers": normalized,
        "cr1": shares[0],
        "cr3": sum(shares[:3]),
        "hhi": hhi(shares),
        "sources": ["https://epoch.ai/data/ai-chip-sales", "https://epoch.ai/data/ai_chip_sales.zip"],
        "evidence": {
            "rawClaim": "NVIDIA cumulative H100e-equivalent compute share through the dataset end date in Epoch AI chip sales data.",
            "extraction": "CR1 = maximum designer share in cumulative_timelines_by_designer.csv after normalizing designer names.",
            "caveat": "Tracks cumulative compute shipped, not current installed base or revenue share.",
        },
    }


def gpu_cluster_us_share() -> dict:
    text = fetch_bytes(EPOCH_GPU_CLUSTERS).decode("utf-8")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows:
        raise ValueError("gpu_clusters CSV is empty")

    us = total = 0.0
    for row in rows:
        if row.get("Status") != "Existing":
            continue
        try:
            ops = float(row["Max OP/s"])
        except (TypeError, ValueError):
            continue
        if ops <= 0:
            continue
        total += ops
        if "United States" in (row.get("Country") or ""):
            us += ops

    if total <= 0:
        raise ValueError("gpu_clusters total OP/s must be > 0")

    share = us / total
    if not 0 <= share <= 1:
        raise ValueError(f"gpu_clusters US share out of range [0,1]: {share}")

    return {
        "asOf": "2025-05",
        "metric": "US share of Max OP/s among Existing GPU clusters in Epoch dataset",
        "topCountry": "United States",
        "topCountryShare": share,
        "sources": [
            "https://epoch.ai/publications/trends-in-ai-supercomputers",
            EPOCH_GPU_CLUSTERS,
        ],
        "evidence": {
            "rawClaim": "Sum of Max OP/s for Existing GPU clusters where Country contains United States.",
            "extraction": "topCountryShare = US Max OP/s divided by global Max OP/s total among Existing clusters in gpu_clusters.csv.",
            "caveat": "Epoch cluster inventory is partial; share is indicative, not exhaustive global cloud capacity.",
        },
        "note": "Epoch dataset covers ~10-20% of global AI chip stock; geographic share is indicative, not exhaustive.",
    }


def main() -> None:
    payload = {
        "fetchedAt": date.today().isoformat(),
        "aiAccelerators": chip_designer_shares(),
        "computeCloud": gpu_cluster_us_share(),
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(
        mode="w",
        encoding="utf-8",
        dir=OUT.parent,
        delete=False,
        suffix=".json.tmp",
    ) as tmp:
        json.dump(payload, tmp, indent=2)
        tmp.write("\n")
        tmp_path = Path(tmp.name)

    tmp_path.replace(OUT)
    print(f"Wrote {OUT}")
    print(f"  NVIDIA CR1 (H100e): {payload['aiAccelerators']['cr1'] * 100:.1f}%")
    print(f"  US cluster OP/s share: {payload['computeCloud']['topCountryShare'] * 100:.1f}%")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"refresh-from-apis failed: {exc}", file=sys.stderr)
        sys.exit(1)
