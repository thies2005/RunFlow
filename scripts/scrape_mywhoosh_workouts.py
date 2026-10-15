#!/usr/bin/env python3
"""
Scrapes or seeds the MyWhoosh workout library into src/data/mywhoosh_workouts.json.
Usage:
  python3 scripts/scrape_mywhoosh_workouts.py --seed
  python3 scripts/scrape_mywhoosh_workouts.py --from-html path/to/mywhooshinfo_workouts.html
"""
import argparse
import json
import pathlib
import re
from typing import Any, Dict, List, Optional

OUTPUT_PATH = (
    pathlib.Path("Web/src/data/mywhoosh_workouts.json")
    if pathlib.Path("Web/src").exists()
    else pathlib.Path("src/data/mywhoosh_workouts.json")
)
MYWHOOSH_LIBRARY_URL = "https://workout.mywhoosh.com/workouts-library"

STEP_LINE_RE = re.compile(
    r"^-\s*([\d.]+)%\s*(?:(\d+)m)?\s*(?:(\d+)s)?(?:\s*(\d+)rpm)?",
    re.IGNORECASE,
)
REPEAT_LINE_RE = re.compile(r"^(\d+)x$", re.IGNORECASE)


def parse_duration(minutes_str: Optional[str], seconds_str: Optional[str]) -> int:
    minutes = int(minutes_str) if minutes_str else 0
    seconds = int(seconds_str) if seconds_str else 0
    return minutes * 60 + seconds


def compute_metrics_and_zones(steps: List[Dict[str, Any]]) -> Dict[str, Any]:
    zones = {"z1": 0, "z2": 0, "z3": 0, "ss": 0, "z4": 0, "z5": 0, "z6": 0}
    total_seconds = 0
    fourth_power_sum = 0.0

    def record_block(duration: int, power_pct: float) -> None:
        nonlocal total_seconds, fourth_power_sum
        if duration <= 0:
            return
        total_seconds += duration
        fourth_power_sum += duration * (power_pct ** 4)
        if power_pct < 0.55:
            zones["z1"] += duration
        elif power_pct <= 0.75:
            zones["z2"] += duration
        elif power_pct <= 0.87:
            zones["z3"] += duration
        elif power_pct <= 0.94:
            zones["ss"] += duration
        elif power_pct <= 1.05:
            zones["z4"] += duration
        elif power_pct <= 1.20:
            zones["z5"] += duration
        else:
            zones["z6"] += duration

    for step in steps:
        stype = step["type"]
        dur = int(step["durationSeconds"])
        p_low = float(step["powerLowPct"])
        p_high = float(step.get("powerHighPct", p_low))
        if stype == "interval":
            reps = int(step.get("repeatCount", 1))
            off_dur = int(step.get("offDurationSeconds", 0))
            off_p = float(step.get("offPowerPct", 0.50))
            for _ in range(reps):
                record_block(dur, p_low)
                record_block(off_dur, off_p)
        else:
            avg_p = (p_low + p_high) / 2.0
            record_block(dur, avg_p)

    if total_seconds == 0:
        return {
            "durationSeconds": 0,
            "intensityFactor": 0.0,
            "tss": 0.0,
            "zoneSeconds": zones,
        }

    intensity_factor = (fourth_power_sum / total_seconds) ** 0.25
    tss = (total_seconds * (intensity_factor ** 2)) / 36.0
    return {
        "durationSeconds": total_seconds,
        "intensityFactor": round(intensity_factor, 2),
        "tss": round(tss, 1),
        "zoneSeconds": zones,
    }


def build_workout_entry(
    wid: str,
    name: str,
    category: str,
    steps_summary: str,
    steps: List[Dict[str, Any]],
    external_url: Optional[str] = None,
) -> Dict[str, Any]:
    metrics = compute_metrics_and_zones(steps)
    entry: Dict[str, Any] = {
        "id": wid,
        "name": name,
        "category": category,
        "durationSeconds": metrics["durationSeconds"],
        "tss": metrics["tss"],
        "intensityFactor": metrics["intensityFactor"],
        "zoneSeconds": metrics["zoneSeconds"],
        "stepsSummary": steps_summary,
        "steps": steps,
        "mywhooshWebLibraryUrl": MYWHOOSH_LIBRARY_URL,
    }
    if external_url:
        entry["externalDetailUrl"] = external_url
    return entry


def get_seed_catalog() -> List[Dict[str, Any]]:
    return [
        build_workout_entry(
            wid="mw-endurance-1",
            name="Endurance Base #1",
            category="Endurance",
            steps_summary="10m Warmup, 40m @ 68% FTP, 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.68, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 2400, "powerLowPct": 0.68, "powerHighPct": 0.68, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-tempo-varied-1",
            name="15min Varied Tempo #1",
            category="Tempo",
            steps_summary="4x (10s @ 180%, 50s @ 50%), 15m Progressive Tempo @ 80-85% FTP (90-100rpm)",
            steps=[
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.50, "powerHighPct": 0.50},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 10, "powerLowPct": 1.80, "powerHighPct": 1.80, "offDurationSeconds": 50, "offPowerPct": 0.50},
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.70, "powerHighPct": 0.70},
                {"type": "steadystate", "durationSeconds": 120, "powerLowPct": 0.57, "powerHighPct": 0.57},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.81, "powerHighPct": 0.81},
                {"type": "steadystate", "durationSeconds": 180, "powerLowPct": 0.56, "powerHighPct": 0.56},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.86, "powerHighPct": 0.86, "cadenceRpm": 90},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.85, "powerHighPct": 0.85, "cadenceRpm": 95},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.85, "powerHighPct": 0.85, "cadenceRpm": 100},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.56, "powerHighPct": 0.56},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.50},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-sweetspot-1",
            name="Sweet Spot #1",
            category="Sweet Spot",
            steps_summary="10m Warmup, 3x10m @ 90% FTP (5m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 600, "powerLowPct": 0.90, "powerHighPct": 0.90, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-threshold-1",
            name="Threshold #1",
            category="Threshold",
            steps_summary="10m Warmup, 3x8m @ 98% FTP (4m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 480, "powerLowPct": 0.98, "powerHighPct": 0.98, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-vo2max-1",
            name="VO2Max #1",
            category="VO2 Max",
            steps_summary="10m Warmup, 5x3m @ 112% FTP (3m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 5, "durationSeconds": 180, "powerLowPct": 1.12, "powerHighPct": 1.12, "offDurationSeconds": 180, "offPowerPct": 0.50, "cadenceRpm": 95},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-under35-hiit-1",
            name="Fast 30min HIIT #1",
            category="Under 35 Min",
            steps_summary="5m Warmup, 10x (1m @ 115% FTP, 1m @ 50% FTP), 5m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 60, "powerLowPct": 1.15, "powerHighPct": 1.15, "offDurationSeconds": 60, "offPowerPct": 0.50, "cadenceRpm": 95},
                {"type": "cooldown", "durationSeconds": 300, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
        build_workout_entry(
            wid="mw-uae-tadej-1",
            name="Train Like Tadej — Pogačar Climb Intervals",
            category="UAE Team Emirates",
            steps_summary="10m Warmup, 4x6m @ 102% FTP (75rpm climbing cadence, 3m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 360, "powerLowPct": 1.02, "powerHighPct": 1.02, "offDurationSeconds": 180, "offPowerPct": 0.55, "cadenceRpm": 75},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            external_url="https://mywhooshinfo.com/workouts/",
        ),
    ]


def main() -> None:
    parser = argparse.ArgumentParser(description="Build MyWhoosh workout JSON catalog.")
    parser.add_argument("--seed", action="store_true", help="Write built-in seed workouts")
    args = parser.parse_args()

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    catalog = get_seed_catalog()
    OUTPUT_PATH.write_text(json.dumps(catalog, indent=2), encoding="utf-8")
    print(f"Wrote {len(catalog)} workouts to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
