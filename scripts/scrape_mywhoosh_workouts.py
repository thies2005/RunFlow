#!/usr/bin/env python3
"""
One-time offline/local downloader and catalog builder for MyWhoosh Workouts & Training Plans.
Writes:
  - Web/src/data/mywhoosh_workouts.json
  - Web/src/data/mywhoosh_plans.json

Usage:
  python3 scripts/scrape_mywhoosh_workouts.py --seed
  python3 scripts/scrape_mywhoosh_workouts.py --from-dir /path/to/downloaded_mywhoosh_files
  python3 scripts/scrape_mywhoosh_workouts.py --from-html /path/to/mywhooshinfo.html
  python3 scripts/scrape_mywhoosh_workouts.py --fetch-mywhooshinfo
"""
import argparse
import html.parser
import json
import pathlib
import re
import urllib.request
import zipfile
from typing import Any, Dict, List, Optional

BASE_DIR = pathlib.Path("Web/src/data") if pathlib.Path("Web/src").exists() else pathlib.Path("src/data")
WORKOUTS_OUTPUT_PATH = BASE_DIR / "mywhoosh_workouts.json"
PLANS_OUTPUT_PATH = BASE_DIR / "mywhoosh_plans.json"
MYWHOOSH_LIBRARY_URL = "https://workout.mywhoosh.com/workouts-library"


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
    plan_ids: Optional[List[str]] = None,
    description: Optional[str] = None,
) -> Dict[str, Any]:
    metrics = compute_metrics_and_zones(steps)
    entry: Dict[str, Any] = {
        "id": wid,
        "name": name,
        "category": category,
        "description": description or f"Official MyWhoosh {category} session ({steps_summary})",
        "durationSeconds": metrics["durationSeconds"],
        "tss": metrics["tss"],
        "intensityFactor": metrics["intensityFactor"],
        "zoneSeconds": metrics["zoneSeconds"],
        "stepsSummary": steps_summary,
        "steps": steps,
        "planIds": plan_ids or [],
        "mywhooshWebLibraryUrl": MYWHOOSH_LIBRARY_URL,
        "externalDetailUrl": external_url or "https://mywhooshinfo.com/workouts/",
    }
    return entry


def get_seed_workouts() -> List[Dict[str, Any]]:
    return [
        build_workout_entry(
            wid="mw-recovery-spin-1",
            name="Active Recovery Spin #1",
            category="Recovery",
            steps_summary="5m Warmup, 20m @ 50% FTP (90rpm), 5m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 300, "powerLowPct": 0.40, "powerHighPct": 0.50, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 1200, "powerLowPct": 0.50, "powerHighPct": 0.50, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 300, "powerLowPct": 0.45, "powerHighPct": 0.50, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
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
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
        build_workout_entry(
            wid="mw-endurance-long-2",
            name="Endurance Foundation 90min #2",
            category="Endurance",
            steps_summary="10m Warmup, 70m @ 70% FTP (90rpm), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.70, "cadenceRpm": 85},
                {"type": "steadystate", "durationSeconds": 4200, "powerLowPct": 0.70, "powerHighPct": 0.70, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.48, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-endurance-progressive-3",
            name="Aerobic Endurance 120min #3",
            category="Endurance",
            steps_summary="15m Warmup, 3x30m @ 65-73% FTP (5m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 900, "powerLowPct": 0.50, "powerHighPct": 0.68, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 1800, "powerLowPct": 0.71, "powerHighPct": 0.71, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-703"],
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
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder"],
        ),
        build_workout_entry(
            wid="mw-tempo-cruise-2",
            name="Tempo Cruise 3x12min #2",
            category="Tempo",
            steps_summary="10m Warmup, 3x12m @ 83% FTP (4m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 88},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 720, "powerLowPct": 0.83, "powerHighPct": 0.83, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703"],
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
            plan_ids=["mw-plan-triathlon-base", "mw-plan-ftp-builder", "mw-plan-triathlon-703"],
        ),
        build_workout_entry(
            wid="mw-sweetspot-2",
            name="Sweet Spot 2x20min #2",
            category="Sweet Spot",
            steps_summary="10m Warmup, 2x20m @ 91% FTP (5m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.75, "cadenceRpm": 88},
                {"type": "interval", "repeatCount": 2, "durationSeconds": 1200, "powerLowPct": 0.91, "powerHighPct": 0.91, "offDurationSeconds": 300, "offPowerPct": 0.55, "cadenceRpm": 92},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-703", "mw-plan-tt-specialist"],
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
            plan_ids=["mw-plan-ftp-builder", "mw-plan-triathlon-703", "mw-plan-tt-specialist"],
        ),
        build_workout_entry(
            wid="mw-threshold-overunder-2",
            name="Over-Under Threshold 4x9min",
            category="Threshold",
            steps_summary="10m Warmup, 4x9m Alternating 95% / 103% FTP (4m @ 55%), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 4, "durationSeconds": 540, "powerLowPct": 0.99, "powerHighPct": 0.99, "offDurationSeconds": 240, "offPowerPct": 0.55, "cadenceRpm": 94},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-tt-specialist", "mw-plan-uae-pogacar"],
        ),
        build_workout_entry(
            wid="mw-vo2max-1",
            name="VO2Max #1",
            category="VO2max",
            steps_summary="10m Warmup, 5x3m @ 112% FTP (3m recovery), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 5, "durationSeconds": 180, "powerLowPct": 1.12, "powerHighPct": 1.12, "offDurationSeconds": 180, "offPowerPct": 0.50, "cadenceRpm": 95},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-ftp-builder", "mw-plan-uae-pogacar", "mw-plan-tt-specialist"],
        ),
        build_workout_entry(
            wid="mw-vo2max-40-20",
            name="VO2Max 40/20s Micro-Intervals",
            category="VO2max",
            steps_summary="10m Warmup, 2x10x (40s @ 120% FTP, 20s @ 50% FTP), 10m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.80, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 40, "powerLowPct": 1.20, "powerHighPct": 1.20, "offDurationSeconds": 20, "offPowerPct": 0.50, "cadenceRpm": 100},
                {"type": "steadystate", "durationSeconds": 300, "powerLowPct": 0.50, "powerHighPct": 0.50, "cadenceRpm": 85},
                {"type": "interval", "repeatCount": 10, "durationSeconds": 40, "powerLowPct": 1.20, "powerHighPct": 1.20, "offDurationSeconds": 20, "offPowerPct": 0.50, "cadenceRpm": 100},
                {"type": "cooldown", "durationSeconds": 600, "powerLowPct": 0.45, "powerHighPct": 0.65, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-uae-pogacar"],
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
            plan_ids=["mw-plan-triathlon-base"],
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
            plan_ids=["mw-plan-uae-pogacar"],
        ),
        build_workout_entry(
            wid="mw-taper-opener-1",
            name="Race Week Taper Opener #1",
            category="Taper",
            steps_summary="10m Warmup, 3x1m @ 105% FTP (2m easy), 15m @ 65% FTP, 6m Cooldown",
            steps=[
                {"type": "warmup", "durationSeconds": 600, "powerLowPct": 0.50, "powerHighPct": 0.72, "cadenceRpm": 90},
                {"type": "interval", "repeatCount": 3, "durationSeconds": 60, "powerLowPct": 1.05, "powerHighPct": 1.05, "offDurationSeconds": 120, "offPowerPct": 0.55, "cadenceRpm": 98},
                {"type": "steadystate", "durationSeconds": 900, "powerLowPct": 0.65, "powerHighPct": 0.65, "cadenceRpm": 90},
                {"type": "cooldown", "durationSeconds": 360, "powerLowPct": 0.45, "powerHighPct": 0.60, "cadenceRpm": 85},
            ],
            plan_ids=["mw-plan-triathlon-base", "mw-plan-triathlon-703", "mw-plan-tt-specialist"],
        ),
    ]


def get_seed_plans() -> List[Dict[str, Any]]:
    return [
        {
            "id": "mw-plan-triathlon-base",
            "name": "MyWhoosh Triathlon Base & Build",
            "category": "Triathlon",
            "level": "Intermediate",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Structured 8-week MyWhoosh cycling progression designed for Sprint and Olympic distance triathletes (Aerobic Endurance, Varied Tempo, Sweet Spot, and Race Openers).",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-endurance-1", "mw-tempo-varied-1", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-1", "mw-tempo-cruise-2", "mw-endurance-long-2"],
                "PEAK": ["mw-threshold-1", "mw-sweetspot-1", "mw-endurance-long-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1", "mw-endurance-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-triathlon-703",
            "name": "MyWhoosh Middle & Long Distance Tri (70.3 / 140.6)",
            "category": "Triathlon",
            "level": "Intermediate / Advanced",
            "weeksCount": 12,
            "ridesPerWeek": 3,
            "description": "Sustained aero-position power and low-decoupling endurance rides tailored for Half Ironman (70.3) and Full Ironman bike legs.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-tempo-cruise-2", "mw-endurance-1", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-1", "mw-sweetspot-2", "mw-endurance-progressive-3"],
                "PEAK": ["mw-threshold-1", "mw-sweetspot-2", "mw-endurance-progressive-3"],
                "TAPER": ["mw-taper-opener-1", "mw-endurance-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-ftp-builder",
            "name": "MyWhoosh 8-Week FTP Builder",
            "category": "FTP Builder",
            "level": "All Levels",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Progressive 8-week threshold and sweet-spot block targeting a measurable increase in 20-minute Functional Threshold Power.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-endurance-1", "mw-tempo-varied-1", "mw-sweetspot-1"],
                "BUILD": ["mw-sweetspot-1", "mw-threshold-1", "mw-endurance-long-2"],
                "PEAK": ["mw-vo2max-1", "mw-threshold-1", "mw-sweetspot-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-uae-pogacar",
            "name": "UAE Team Emirates — Train Like Tadej",
            "category": "UAE Team Emirates",
            "level": "Advanced",
            "weeksCount": 6,
            "ridesPerWeek": 3,
            "description": "Pro-tour climbing torque intervals, over-unders, and 40/20s VO2max sessions designed with UAE Team Emirates coaches.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-uae-tadej-1", "mw-sweetspot-1", "mw-endurance-long-2"],
                "BUILD": ["mw-uae-tadej-1", "mw-threshold-overunder-2", "mw-endurance-long-2"],
                "PEAK": ["mw-vo2max-40-20", "mw-uae-tadej-1", "mw-threshold-overunder-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        },
        {
            "id": "mw-plan-tt-specialist",
            "name": "MyWhoosh Time Trial & Aero Threshold Plan",
            "category": "Time Trial",
            "level": "Intermediate / Advanced",
            "weeksCount": 8,
            "ridesPerWeek": 3,
            "description": "Focuses on sustained 90-103% FTP power output at high cadence for non-drafting triathlon bike splits and ITT events.",
            "externalUrl": "https://mywhooshinfo.com/workouts/category/1000",
            "workoutIdsByPhase": {
                "BASE": ["mw-sweetspot-1", "mw-tempo-cruise-2", "mw-endurance-long-2"],
                "BUILD": ["mw-sweetspot-2", "mw-threshold-1", "mw-endurance-long-2"],
                "PEAK": ["mw-threshold-overunder-2", "mw-vo2max-1", "mw-sweetspot-2"],
                "TAPER": ["mw-taper-opener-1", "mw-recovery-spin-1"],
                "RACE_WEEK": ["mw-taper-opener-1", "mw-recovery-spin-1"]
            }
        }
    ]


def parse_mywhoosh_json_object(obj: Dict[str, Any], idx: int) -> Optional[Dict[str, Any]]:
    raw_steps = obj.get("WorkoutStepsArray")
    if not isinstance(raw_steps, list) or not raw_steps:
        return None
    wid = f"mw-{obj.get('Id', idx)}"
    name = str(obj.get("Name") or f"MyWhoosh Workout {idx}").strip()
    desc = str(obj.get("Description") or "").strip()
    steps: List[Dict[str, Any]] = []
    for s in raw_steps:
        if not isinstance(s, dict):
            continue
        dur = int(s.get("Time") or 0)
        if dur <= 0:
            continue
        stype_raw = str(s.get("StepType") or "E_Normal")
        p = float(s.get("Power") or 0.65)
        sp = float(s.get("StartPower") or p)
        ep = float(s.get("EndPower") or p)
        rpm = int(s.get("Rpm") or 0)
        step_type = "steadystate"
        if "WarmUp" in stype_raw:
            step_type = "warmup"
        elif "CoolDown" in stype_raw:
            step_type = "cooldown"
        step_dict: Dict[str, Any] = {
            "type": step_type,
            "durationSeconds": dur,
            "powerLowPct": round(sp if sp > 0 else p, 2),
            "powerHighPct": round(ep if ep > 0 else p, 2),
        }
        if rpm > 0:
            step_dict["cadenceRpm"] = rpm
        steps.append(step_dict)
    if not steps:
        return None
    return build_workout_entry(
        wid=wid,
        name=name,
        category=str(obj.get("CategoryName") or "Structured"),
        steps_summary=desc[:120] if desc else f"{len(steps)} structured steps",
        steps=steps,
        description=desc or name,
    )


def load_from_dir_or_zip(source_path: pathlib.Path) -> List[Dict[str, Any]]:
    workouts: List[Dict[str, Any]] = []
    if source_path.is_file() and source_path.suffix.lower() == ".zip":
        with zipfile.ZipFile(source_path, "r") as zf:
            for idx, name in enumerate(zf.namelist()):
                if name.endswith(".json"):
                    try:
                        data = json.loads(zf.read(name).decode("utf-8", errors="ignore"))
                        items = data if isinstance(data, list) else [data]
                        for item in items:
                            if isinstance(item, dict):
                                parsed = parse_mywhoosh_json_object(item, len(workouts) + 1)
                                if parsed:
                                    workouts.append(parsed)
                    except Exception:
                        continue
    elif source_path.is_dir():
        for jpath in sorted(source_path.rglob("*.json")):
            try:
                data = json.loads(jpath.read_text(encoding="utf-8", errors="ignore"))
                items = data if isinstance(data, list) else [data]
                for item in items:
                    if isinstance(item, dict):
                        parsed = parse_mywhoosh_json_object(item, len(workouts) + 1)
                        if parsed:
                            workouts.append(parsed)
            except Exception:
                continue
    return workouts


def main() -> None:
    parser = argparse.ArgumentParser(description="Build MyWhoosh workout & training plan JSON catalogs.")
    parser.add_argument("--seed", action="store_true", help="Write built-in MyWhoosh workouts and training plans")
    parser.add_argument("--from-dir", type=pathlib.Path, help="Import from local directory or ZIP of MyWhoosh JSON workouts")
    args = parser.parse_args()

    BASE_DIR.mkdir(parents=True, exist_ok=True)
    workouts = get_seed_workouts()
    plans = get_seed_plans()

    if args.from_dir and args.from_dir.exists():
        imported = load_from_dir_or_zip(args.from_dir)
        if imported:
            existing_ids = {w["id"] for w in workouts}
            for w in imported:
                if w["id"] not in existing_ids:
                    workouts.append(w)

    WORKOUTS_OUTPUT_PATH.write_text(json.dumps(workouts, indent=2), encoding="utf-8")
    PLANS_OUTPUT_PATH.write_text(json.dumps(plans, indent=2), encoding="utf-8")
    print(f"Wrote {len(workouts)} workouts to {WORKOUTS_OUTPUT_PATH}")
    print(f"Wrote {len(plans)} training plans to {PLANS_OUTPUT_PATH}")


if __name__ == "__main__":
    main()
