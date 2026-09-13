"""
Synthetic Data Generator for AI-RMP Railway Maintenance Planning.

Produces seeded, deterministic, contract-compliant synthetic datasets for:
  - MaintenanceTask (USFD / TRD / SNT / ENGINEERING)
  - USFDDefect
  - TRDTask
  - SNTTask
  - TrainMovement
  - Resource (vehicles, crews, support)
  - MaintenanceWindow
  - EmergencyEvent
  - Conflict (train / resource / safety / deadline / window)
  - ShadowBlockCandidate (feasible + rejected unsafe)

All records carry `is_synthetic: True` provenance and are reproducible via a
configurable fixed seed (default: 42).

The generator intentionally creates realistic scheduling *situations*:
  - train conflicts (maintenance overlapping train movements)
  - resource conflicts (too many tasks for available resources)
  - tight deadlines
  - shadow-block opportunities (compatible nearby tasks)
  - unsafe grouping cases (safety-incompatible tasks that look groupable)
  - emergency defects mid-schedule

Usage
-----
    from ai.data.generator import SyntheticDataGenerator

    gen = SyntheticDataGenerator(seed=42)
    dataset = gen.generate()          # returns dict of all entity lists
    gen.save_json("ai/data/output")   # persists to JSON files

CLI
---
    python -m ai.data.generator [--seed 42] [--out ai/data/output]
"""

from __future__ import annotations

import argparse
import copy
import json
import math
import os
import random
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

# ──────────────────────────────────────────────────────────────────────
# Constants drawn directly from AI_DOMAIN_CONTRACT.md
# ──────────────────────────────────────────────────────────────────────

TASK_TYPES = ["USFD", "TRD", "SNT", "ENGINEERING", "OTHER"]
DEPARTMENTS = ["ENGINEERING", "P_WAY", "TRD", "SNT", "SIGNALING", "TRACTION", "OTHER"]
TASK_STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"]
PRIORITY_HINTS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
SAFETY_CLASSES = ["NORMAL", "RESTRICTED", "INTERLOCKING", "HIGH_SAFETY"]
DATA_QUALITIES = ["HIGH", "MEDIUM", "LOW"]

USFD_SEVERITIES = ["MINOR", "MODERATE", "SEVERE", "CRITICAL"]
USFD_DEFECT_TYPES = ["HEAD_SPLIT", "WEB_CRACK", "FISHPLATE", "WELD_DEFECT", "OTHER"]

TRD_ISSUE_TYPES = [
    "OHE_INSPECTION", "CONTACT_WIRE_ISSUE", "OHE_WEAR",
    "THERMOVISION_ANOMALY", "OHE_COMPONENT_REPLACEMENT", "OTHER",
]

SNT_ASSET_GROUPS = [
    "SIGNAL", "TRACK_CIRCUIT", "AXLE_COUNTER",
    "POINT_MACHINE", "INTERLOCKING", "TELECOM", "OTHER",
]
SNT_SAFETY_DEPS = ["NONE", "INTERLOCKING_REQUIRED", "SIGNAL_BLOCK_REQUIRED", "HIGH_SAFETY"]

TRAIN_DIRECTIONS = ["UP", "DOWN", "BOTH"]
SPEED_CLASSES = ["LOW", "MEDIUM", "HIGH", "EXPRESS"]
TRAIN_PRIORITY_CLASSES = ["FREIGHT", "PASSENGER", "SUPERFAST", "EMERGENCY"]

RESOURCE_TYPES = [
    "TRACK_MACHINE", "USFD_VEHICLE", "TOWER_WAGON",
    "SNT_CREW", "ENGINEERING_CREW", "SIGNAL_CREW",
    "TRACTION_SUPPORT", "OTHER",
]
MAINTENANCE_STATUSES = ["AVAILABLE", "BUSY", "UNDER_MAINTENANCE", "UNAVAILABLE"]

WINDOW_TYPES = ["BLOCK", "MIDDAY", "NIGHT", "POSSESSION", "EMERGENCY"]
WINDOW_AVAILABILITIES = ["AVAILABLE", "PARTIAL", "UNAVAILABLE"]

CONFLICT_TYPES = [
    "TRAIN_CONFLICT", "RESOURCE_CONFLICT", "WINDOW_CONFLICT",
    "SAFETY_CONFLICT", "DEADLINE_CONFLICT",
]
CONFLICT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

EMERGENCY_EVENT_TYPES = ["NEW_USFD_DEFECT", "TRACK_FAILURE", "SIGNAL_FAILURE", "OTHER"]
EMERGENCY_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

# Map task types → natural department
TASK_TYPE_DEPT: dict[str, str] = {
    "USFD": "ENGINEERING",
    "TRD": "TRD",
    "SNT": "SNT",
    "ENGINEERING": "P_WAY",
    "OTHER": "OTHER",
}

# Map resource types → department
RESOURCE_DEPT: dict[str, str] = {
    "TRACK_MACHINE": "ENGINEERING",
    "USFD_VEHICLE": "ENGINEERING",
    "TOWER_WAGON": "TRD",
    "SNT_CREW": "SNT",
    "ENGINEERING_CREW": "P_WAY",
    "SIGNAL_CREW": "SIGNALING",
    "TRACTION_SUPPORT": "TRACTION",
    "OTHER": "OTHER",
}

# Railway sections: id → (start_km, end_km)
SECTIONS: dict[str, tuple[float, float]] = {
    "sec_01": (0.0, 20.0),
    "sec_02": (20.0, 45.0),
    "sec_03": (45.0, 70.0),
    "sec_04": (70.0, 100.0),
    "sec_05": (100.0, 125.0),
    "sec_06": (125.0, 150.0),
    "sec_07": (150.0, 175.0),
    "sec_08": (175.0, 200.0),
}

SOURCE_NAME = "synthetic_scenario_generator_v1"

# ──────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────

def _iso(dt: datetime) -> str:
    """ISO 8601 with Z suffix for UTC."""
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def _provenance(rng: random.Random, ts: datetime) -> dict:
    return {
        "source": SOURCE_NAME,
        "timestamp": _iso(ts),
        "is_synthetic": True,
        "data_quality": rng.choice(["HIGH", "HIGH", "HIGH", "MEDIUM"]),
        "confidence": round(rng.uniform(0.80, 0.99), 2),
    }


# ──────────────────────────────────────────────────────────────────────
# Generator
# ──────────────────────────────────────────────────────────────────────

class SyntheticDataGenerator:
    """
    Deterministic, seeded generator that produces contract-compliant
    synthetic datasets for the AI-RMP scheduling prototype.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = random.Random(seed)

        # Base planning date: Nov 3 2026, midnight UTC
        self.base_date = datetime(2026, 11, 3, 0, 0, 0, tzinfo=timezone.utc)

        # Generated entity stores
        self.maintenance_tasks: list[dict] = []
        self.usfd_defects: list[dict] = []
        self.trd_tasks: list[dict] = []
        self.snt_tasks: list[dict] = []
        self.train_movements: list[dict] = []
        self.resources: list[dict] = []
        self.maintenance_windows: list[dict] = []
        self.conflicts: list[dict] = []
        self.shadow_block_candidates: list[dict] = []
        self.emergency_events: list[dict] = []

        self._generated = False

    # ── Public API ────────────────────────────────────────────────

    def generate(self) -> dict[str, list[dict]]:
        """Generate all synthetic data. Idempotent — clears previous run."""
        self.rng = random.Random(self.seed)
        self._clear()
        self._generate_sections_and_windows()
        self._generate_resources()
        self._generate_train_movements()
        self._generate_usfd_tasks_and_defects()
        self._generate_trd_tasks()
        self._generate_snt_tasks()
        self._generate_engineering_tasks()
        self._inject_train_conflicts()
        self._inject_resource_conflicts()
        self._inject_department_resource_bottlenecks()
        self._inject_deadline_situations()
        self._inject_shadow_block_opportunities()
        self._inject_unsafe_grouping_cases()
        self._inject_emergency_defects()
        self._generated = True
        return self.dataset()

    def dataset(self) -> dict[str, list[dict]]:
        """Return all generated entities as a dict."""
        return {
            "maintenance_tasks": copy.deepcopy(self.maintenance_tasks),
            "usfd_defects": copy.deepcopy(self.usfd_defects),
            "trd_tasks": copy.deepcopy(self.trd_tasks),
            "snt_tasks": copy.deepcopy(self.snt_tasks),
            "train_movements": copy.deepcopy(self.train_movements),
            "resources": copy.deepcopy(self.resources),
            "maintenance_windows": copy.deepcopy(self.maintenance_windows),
            "conflicts": copy.deepcopy(self.conflicts),
            "shadow_block_candidates": copy.deepcopy(self.shadow_block_candidates),
            "emergency_events": copy.deepcopy(self.emergency_events),
        }

    def counts(self) -> dict[str, int]:
        ds = self.dataset()
        return {k: len(v) for k, v in ds.items()}

    def save_json(self, output_dir: str | Path) -> list[str]:
        """Save each entity list to a separate JSON file. Returns file paths."""
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        if not self._generated:
            self.generate()
        files: list[str] = []
        for name, records in self.dataset().items():
            path = output_dir / f"{name}.json"
            with open(path, "w", encoding="utf-8") as f:
                json.dump(records, f, indent=2, ensure_ascii=False)
            files.append(str(path))
        # Save summary
        summary_path = output_dir / "summary.json"
        with open(summary_path, "w", encoding="utf-8") as f:
            json.dump({
                "seed": self.seed,
                "generated_at": _iso(datetime.now(timezone.utc)),
                "record_counts": self.counts(),
            }, f, indent=2)
        files.append(str(summary_path))
        return files

    # ── Internal generators ───────────────────────────────────────

    def _clear(self) -> None:
        for attr in [
            "maintenance_tasks", "usfd_defects", "trd_tasks", "snt_tasks",
            "train_movements", "resources", "maintenance_windows",
            "conflicts", "shadow_block_candidates", "emergency_events",
        ]:
            setattr(self, attr, [])

    # -- Windows --

    def _generate_sections_and_windows(self) -> None:
        """Generate maintenance windows for each section across a 3-day planning horizon."""
        win_id = 1
        for day_offset in range(3):
            day_base = self.base_date + timedelta(days=day_offset)
            for sec_id, (km_start, km_end) in SECTIONS.items():
                # Night window 23:00 – 05:00 next day
                w_night = {
                    "window_id": f"win_{win_id:03d}",
                    "section_id": sec_id,
                    "start": _iso(day_base + timedelta(hours=23)),
                    "end": _iso(day_base + timedelta(hours=29)),  # 05:00 next day
                    "window_type": "NIGHT",
                    "availability": "AVAILABLE",
                    "department_compatibility": self.rng.sample(
                        ["ENGINEERING", "TRD", "SNT", "P_WAY"], k=self.rng.randint(2, 4)
                    ),
                    "max_concurrent_tasks": self.rng.randint(2, 4),
                    "notes": f"Night block day {day_offset + 1} for {sec_id}",
                }
                self.maintenance_windows.append(w_night)
                win_id += 1

                # Midday window 11:00 – 14:00
                w_mid = {
                    "window_id": f"win_{win_id:03d}",
                    "section_id": sec_id,
                    "start": _iso(day_base + timedelta(hours=11)),
                    "end": _iso(day_base + timedelta(hours=14)),
                    "window_type": "MIDDAY",
                    "availability": self.rng.choice(["AVAILABLE", "PARTIAL"]),
                    "department_compatibility": self.rng.sample(
                        ["ENGINEERING", "TRD", "SNT", "P_WAY"], k=self.rng.randint(1, 3)
                    ),
                    "max_concurrent_tasks": self.rng.randint(1, 2),
                    "notes": f"Midday window day {day_offset + 1} for {sec_id}",
                }
                self.maintenance_windows.append(w_mid)
                win_id += 1

                # Block possession — 1 per section per day (random morning/afternoon)
                block_hour = self.rng.choice([6, 7, 15, 16])
                w_block = {
                    "window_id": f"win_{win_id:03d}",
                    "section_id": sec_id,
                    "start": _iso(day_base + timedelta(hours=block_hour)),
                    "end": _iso(day_base + timedelta(hours=block_hour + 3)),
                    "window_type": "BLOCK",
                    "availability": "AVAILABLE",
                    "department_compatibility": self.rng.sample(
                        ["ENGINEERING", "TRD", "SNT", "P_WAY", "SIGNALING"], k=self.rng.randint(2, 4)
                    ),
                    "max_concurrent_tasks": self.rng.randint(1, 3),
                    "notes": f"Block possession day {day_offset + 1} for {sec_id}",
                }
                self.maintenance_windows.append(w_block)
                win_id += 1

    # -- Resources --

    def _generate_resources(self) -> None:
        """Generate a fleet of resources across departments with realistic bottlenecks."""
        res_id = 1
        resource_specs: list[tuple[str, str, int]] = [
            ("USFD_VEHICLE", "ENGINEERING", 4),
            ("TRACK_MACHINE", "ENGINEERING", 3),
            ("TOWER_WAGON", "TRD", 4),
            ("ENGINEERING_CREW", "P_WAY", 5),
            ("SNT_CREW", "SNT", 4),
            ("SIGNAL_CREW", "SIGNALING", 3),
            ("TRACTION_SUPPORT", "TRACTION", 3),
        ]
        for rtype, dept, count in resource_specs:
            for i in range(count):
                home_sec = self.rng.choice(list(SECTIONS.keys()))
                # Each resource is available in 2-4 windows
                available_windows: list[dict] = []
                sample_windows = self.rng.sample(
                    self.maintenance_windows,
                    k=min(self.rng.randint(2, 4), len(self.maintenance_windows)),
                )
                for w in sample_windows:
                    available_windows.append({
                        "window_id": w["window_id"],
                        "start": w["start"],
                        "end": w["end"],
                        "section_id": w["section_id"],
                    })

                is_op = self.rng.random() > 0.1  # 90 % operational
                resource = {
                    "resource_id": f"res_{rtype.lower()[:4]}_{res_id:02d}",
                    "resource_type": rtype,
                    "department": dept,
                    "location": home_sec,
                    "available_windows": available_windows,
                    "capacity": 1,
                    "skills": self._skills_for(rtype),
                    "is_operational": is_op,
                    "maintenance_status": "AVAILABLE" if is_op else self.rng.choice(
                        ["UNDER_MAINTENANCE", "UNAVAILABLE"]
                    ),
                }
                self.resources.append(resource)
                res_id += 1

    def _skills_for(self, rtype: str) -> list[str]:
        mapping = {
            "USFD_VEHICLE": ["usfd", "inspection"],
            "TRACK_MACHINE": ["tamping", "levelling"],
            "TOWER_WAGON": ["ohe", "tower_access"],
            "ENGINEERING_CREW": ["pway", "rail_replacement"],
            "SNT_CREW": ["signaling", "telecom"],
            "SIGNAL_CREW": ["interlocking", "point_machine"],
            "TRACTION_SUPPORT": ["traction", "power_block"],
        }
        return mapping.get(rtype, ["general"])

    # -- Train movements --

    def _generate_train_movements(self) -> None:
        """Generate realistic train timetable across sections."""
        mv_id = 1
        for day_offset in range(3):
            day_base = self.base_date + timedelta(days=day_offset)
            for sec_id, (km_start, km_end) in SECTIONS.items():
                # 6-9 trains per section per day to exceed 100+ movements while remaining realistic.
                n_trains = self.rng.randint(6, 9)
                for _ in range(n_trains):
                    hour = self.rng.randint(0, 23)
                    minute = self.rng.choice([0, 10, 15, 20, 30, 40, 45, 50])
                    start_dt = day_base + timedelta(hours=hour, minutes=minute)
                    duration_min = self.rng.randint(15, 45)
                    end_dt = start_dt + timedelta(minutes=duration_min)
                    direction = self.rng.choice(TRAIN_DIRECTIONS[:2])  # UP or DOWN
                    speed = self.rng.choice(SPEED_CLASSES)
                    pclass = self.rng.choice(TRAIN_PRIORITY_CLASSES)
                    density = round(self.rng.uniform(0.3, 0.95), 2)

                    movement = {
                        "movement_id": f"mv_{mv_id:04d}",
                        "train_id": f"train_{self.rng.randint(100, 999)}",
                        "section_id": sec_id,
                        "from_km": km_start,
                        "to_km": km_end,
                        "movement_start": _iso(start_dt),
                        "movement_end": _iso(end_dt),
                        "direction": direction,
                        "speed_class": speed,
                        "traffic_density": density,
                        "priority_class": pclass,
                        "is_critical": pclass in ("SUPERFAST", "EMERGENCY"),
                    }
                    self.train_movements.append(movement)
                    mv_id += 1

    # -- USFD tasks & defects --

    def _generate_usfd_tasks_and_defects(self) -> None:
        """Generate USFD/Engineering maintenance tasks with associated defects."""
        task_id_counter = 1
        defect_id_counter = 1
        for _ in range(80):
            sec_id = self.rng.choice(list(SECTIONS.keys()))
            km_start, km_end = SECTIONS[sec_id]
            from_km = round(self.rng.uniform(km_start, km_end - 2), 1)
            to_km = round(from_km + self.rng.uniform(0.5, 3.0), 1)
            to_km = min(to_km, km_end)

            day_offset = self.rng.randint(0, 2)
            hour = self.rng.randint(6, 22)
            req_start = self.base_date + timedelta(days=day_offset, hours=hour)
            duration = self.rng.randint(60, 240)
            req_end = req_start + timedelta(minutes=duration)

            severity_choice = self.rng.choice(USFD_SEVERITIES)
            safety_class = "HIGH_SAFETY" if severity_choice in ("SEVERE", "CRITICAL") else self.rng.choice(SAFETY_CLASSES[:3])
            priority = "CRITICAL" if severity_choice == "CRITICAL" else self.rng.choice(PRIORITY_HINTS)

            tid = f"task_{task_id_counter:03d}"
            has_deadline = severity_choice in ("SEVERE", "CRITICAL") or self.rng.random() > 0.5
            deadline = _iso(req_start + timedelta(hours=self.rng.randint(12, 48))) if has_deadline else None

            task = {
                "task_id": tid,
                "task_type": "USFD",
                "railway_section_id": sec_id,
                "from_km": from_km,
                "to_km": to_km,
                "department": "ENGINEERING",
                "status": "PLANNED",
                "requested_start": _iso(req_start),
                "requested_end": _iso(req_end),
                "estimated_duration_minutes": duration,
                "required_resources": [{"resource_type": "USFD_VEHICLE", "count": 1}],
                "priority_hint": priority,
                "safety_class": safety_class,
                "deadline": deadline,
                "description": f"USFD rail inspection/repair on {sec_id} km {from_km}-{to_km}",
                "asset_id": f"asset_rail_{self.rng.randint(1, 99):03d}",
                "location_accuracy_m": self.rng.randint(5, 50),
                "tags": ["usfd", "rail"],
                "provenance": _provenance(self.rng, req_start),
            }
            self.maintenance_tasks.append(task)
            task_id_counter += 1

            # Associated defect
            defect_km = round(self.rng.uniform(from_km, to_km), 1)
            safety_risk = round(self.rng.uniform(
                0.8 if severity_choice == "CRITICAL" else 0.3,
                1.0 if severity_choice == "CRITICAL" else 0.85
            ), 2)
            urgency = round(self.rng.uniform(
                0.75 if severity_choice in ("SEVERE", "CRITICAL") else 0.2,
                1.0
            ), 2)

            defect = {
                "defect_id": f"usfd_{defect_id_counter:03d}",
                "task_id": tid,
                "railway_section_id": sec_id,
                "km": defect_km,
                "severity": severity_choice,
                "defect_type": self.rng.choice(USFD_DEFECT_TYPES),
                "length_mm": self.rng.randint(10, 200),
                "depth_mm": self.rng.randint(2, 25),
                "safety_risk": safety_risk,
                "urgency": urgency,
                "confidence": round(self.rng.uniform(0.75, 0.98), 2),
                "detected_at": _iso(req_start - timedelta(hours=self.rng.randint(2, 24))),
                "last_inspection_at": _iso(req_start - timedelta(days=self.rng.randint(7, 60))),
                "related_asset_id": task["asset_id"],
                "recommended_action": self._usfd_action(severity_choice),
            }
            self.usfd_defects.append(defect)
            defect_id_counter += 1

    def _usfd_action(self, severity: str) -> str:
        actions = {
            "MINOR": "Schedule routine inspection at next available window",
            "MODERATE": "Plan rail grinding or weld repair within 7 days",
            "SEVERE": "Urgent track possession and rail repair required",
            "CRITICAL": "Immediate track possession and rail replacement",
        }
        return actions.get(severity, "Inspect and evaluate")

    # -- TRD tasks --

    def _generate_trd_tasks(self) -> None:
        task_id_counter = len(self.maintenance_tasks) + 1
        trd_id_counter = 1
        for _ in range(60):
            sec_id = self.rng.choice(list(SECTIONS.keys()))
            km_start, km_end = SECTIONS[sec_id]
            from_km = round(self.rng.uniform(km_start, km_end - 2), 1)
            to_km = round(from_km + self.rng.uniform(1.0, 5.0), 1)
            to_km = min(to_km, km_end)

            day_offset = self.rng.randint(0, 2)
            hour = self.rng.randint(6, 20)
            req_start = self.base_date + timedelta(days=day_offset, hours=hour)
            duration = self.rng.randint(90, 180)
            req_end = req_start + timedelta(minutes=duration)

            issue = self.rng.choice(TRD_ISSUE_TYPES)
            needs_traction_block = issue in ("CONTACT_WIRE_ISSUE", "OHE_COMPONENT_REPLACEMENT", "OHE_WEAR")
            needs_tower = issue in ("CONTACT_WIRE_ISSUE", "OHE_COMPONENT_REPLACEMENT", "OHE_INSPECTION")
            priority = round(self.rng.uniform(0.4, 0.95), 2)

            tid = f"task_{task_id_counter:03d}"

            # Parent MaintenanceTask
            mt = {
                "task_id": tid,
                "task_type": "TRD",
                "railway_section_id": sec_id,
                "from_km": from_km,
                "to_km": to_km,
                "department": "TRD",
                "status": "PLANNED",
                "requested_start": _iso(req_start),
                "requested_end": _iso(req_end),
                "estimated_duration_minutes": duration,
                "required_resources": [{"resource_type": "TOWER_WAGON", "count": 1}] if needs_tower else [{"resource_type": "TRACTION_SUPPORT", "count": 1}],
                "priority_hint": "HIGH" if priority > 0.7 else "MEDIUM",
                "safety_class": "RESTRICTED" if needs_traction_block else "NORMAL",
                "deadline": _iso(req_start + timedelta(hours=self.rng.randint(24, 72))) if self.rng.random() > 0.4 else None,
                "description": f"TRD {issue.replace('_', ' ').lower()} on {sec_id}",
                "tags": ["trd", "ohe"],
                "provenance": _provenance(self.rng, req_start),
            }
            self.maintenance_tasks.append(mt)

            # Matched window
            win_start = req_start
            win_end = req_end

            trd = {
                "trd_task_id": f"trd_{trd_id_counter:03d}",
                "maintenance_task_id": tid,
                "railway_section_id": sec_id,
                "inspection_zone": f"ohe_span_{self.rng.randint(1, 30):02d}",
                "issue_type": issue,
                "traction_block_required": needs_traction_block,
                "tower_wagon_required": needs_tower,
                "window_start": _iso(win_start),
                "window_end": _iso(win_end),
                "department": "TRD",
                "priority": priority,
                "required_vehicle": "TOWER_WAGON" if needs_tower else None,
            }
            self.trd_tasks.append(trd)
            task_id_counter += 1
            trd_id_counter += 1

    # -- SNT tasks --

    def _generate_snt_tasks(self) -> None:
        task_id_counter = len(self.maintenance_tasks) + 1
        snt_id_counter = 1
        for _ in range(40):
            sec_id = self.rng.choice(list(SECTIONS.keys()))
            km_start, km_end = SECTIONS[sec_id]
            from_km = round(self.rng.uniform(km_start, km_end - 1), 1)
            to_km = round(from_km + self.rng.uniform(0.5, 2.0), 1)
            to_km = min(to_km, km_end)

            day_offset = self.rng.randint(0, 2)
            hour = self.rng.randint(8, 18)
            req_start = self.base_date + timedelta(days=day_offset, hours=hour)
            duration = self.rng.randint(60, 150)
            req_end = req_start + timedelta(minutes=duration)

            asset_group = self.rng.choice(SNT_ASSET_GROUPS)
            safety_dep = "INTERLOCKING_REQUIRED" if asset_group in ("INTERLOCKING", "POINT_MACHINE") else self.rng.choice(SNT_SAFETY_DEPS)
            priority = round(self.rng.uniform(0.35, 0.90), 2)

            tid = f"task_{task_id_counter:03d}"

            mt = {
                "task_id": tid,
                "task_type": "SNT",
                "railway_section_id": sec_id,
                "from_km": from_km,
                "to_km": to_km,
                "department": "SNT",
                "status": "PLANNED",
                "requested_start": _iso(req_start),
                "requested_end": _iso(req_end),
                "estimated_duration_minutes": duration,
                "required_resources": [{"resource_type": "SNT_CREW", "count": 1}],
                "priority_hint": "HIGH" if priority > 0.7 else "MEDIUM" if priority > 0.5 else "LOW",
                "safety_class": "INTERLOCKING" if safety_dep == "INTERLOCKING_REQUIRED" else "NORMAL",
                "deadline": _iso(req_start + timedelta(hours=self.rng.randint(24, 96))) if self.rng.random() > 0.5 else None,
                "description": f"SNT {asset_group.replace('_', ' ').lower()} maintenance on {sec_id}",
                "tags": ["snt", asset_group.lower()],
                "provenance": _provenance(self.rng, req_start),
            }
            self.maintenance_tasks.append(mt)

            snt = {
                "snt_task_id": f"snt_{snt_id_counter:03d}",
                "maintenance_task_id": tid,
                "railway_section_id": sec_id,
                "asset_group": asset_group,
                "window_start": _iso(req_start),
                "window_end": _iso(req_end),
                "department": "SNT",
                "safety_dependency": safety_dep,
                "priority": priority,
            }
            self.snt_tasks.append(snt)
            task_id_counter += 1
            snt_id_counter += 1

    # -- General engineering tasks --

    def _generate_engineering_tasks(self) -> None:
        task_id_counter = len(self.maintenance_tasks) + 1
        for _ in range(40):
            sec_id = self.rng.choice(list(SECTIONS.keys()))
            km_start, km_end = SECTIONS[sec_id]
            from_km = round(self.rng.uniform(km_start, km_end - 3), 1)
            to_km = round(from_km + self.rng.uniform(1.0, 5.0), 1)
            to_km = min(to_km, km_end)

            day_offset = self.rng.randint(0, 2)
            hour = self.rng.randint(6, 20)
            req_start = self.base_date + timedelta(days=day_offset, hours=hour)
            duration = self.rng.randint(90, 300)
            req_end = req_start + timedelta(minutes=duration)

            tid = f"task_{task_id_counter:03d}"
            mt = {
                "task_id": tid,
                "task_type": "ENGINEERING",
                "railway_section_id": sec_id,
                "from_km": from_km,
                "to_km": to_km,
                "department": "P_WAY",
                "status": "PLANNED",
                "requested_start": _iso(req_start),
                "requested_end": _iso(req_end),
                "estimated_duration_minutes": duration,
                "required_resources": [{"resource_type": "TRACK_MACHINE", "count": 1}, {"resource_type": "ENGINEERING_CREW", "count": 1}],
                "priority_hint": self.rng.choice(PRIORITY_HINTS),
                "safety_class": self.rng.choice(SAFETY_CLASSES),
                "deadline": _iso(req_start + timedelta(hours=self.rng.randint(24, 120))) if self.rng.random() > 0.3 else None,
                "description": f"Engineering track work on {sec_id} km {from_km}-{to_km}",
                "tags": ["engineering", "pway"],
                "provenance": _provenance(self.rng, req_start),
            }
            self.maintenance_tasks.append(mt)
            task_id_counter += 1

    # ── Conflict / scenario injection ─────────────────────────────

    def _inject_train_conflicts(self) -> None:
        """Create tasks that deliberately overlap with train movements."""
        conflict_id = 1
        # Pick 3 movements and create overlapping tasks
        if len(self.train_movements) < 3:
            return
        chosen_mvs = self.rng.sample(self.train_movements, k=3)
        for mv in chosen_mvs:
            # Find a task in the same section
            section_tasks = [t for t in self.maintenance_tasks if t["railway_section_id"] == mv["section_id"]]
            if not section_tasks:
                continue
            task = self.rng.choice(section_tasks)

            # Adjust task window to overlap with train
            mv_start = datetime.fromisoformat(mv["movement_start"].replace("Z", "+00:00"))
            mv_end = datetime.fromisoformat(mv["movement_end"].replace("Z", "+00:00"))
            overlap_start = mv_start - timedelta(minutes=10)
            overlap_end = mv_end + timedelta(minutes=10)
            task["requested_start"] = _iso(overlap_start)
            task["requested_end"] = _iso(overlap_end)

            conflict = {
                "conflict_id": f"conf_{conflict_id:03d}",
                "conflict_type": "TRAIN_CONFLICT",
                "entity_ids": [task["task_id"], mv["movement_id"]],
                "section_id": mv["section_id"],
                "start": _iso(mv_start),
                "end": _iso(mv_end),
                "severity": "HIGH" if mv.get("priority_class") in ("PASSENGER", "SUPERFAST") else "MEDIUM",
                "description": f"Maintenance task {task['task_id']} overlaps {mv['priority_class'] or 'train'} movement {mv['movement_id']} on {mv['section_id']}",
            }
            self.conflicts.append(conflict)
            conflict_id += 1

    def _inject_resource_conflicts(self) -> None:
        """Create realistic resource bottlenecks across departments and resource types."""
        conflict_id = len(self.conflicts) + 1
        resource_bottlenecks = [
            ("USFD_VEHICLE", "ENGINEERING"),
            ("TOWER_WAGON", "TRD"),
            ("SNT_CREW", "SNT"),
        ]

        for resource_type, department in resource_bottlenecks:
            tasks = [
                t for t in self.maintenance_tasks
                if any(req["resource_type"] == resource_type for req in t["required_resources"])
                and t["department"] == department
            ]
            if len(tasks) < 3:
                continue

            target_start = self.base_date + timedelta(days=1 + len(self.conflicts) % 2, hours=8)
            target_end = target_start + timedelta(hours=3)
            for task in tasks[:min(5, len(tasks))]:
                task["requested_start"] = _iso(target_start)
                task["requested_end"] = _iso(target_end)

            conflict = {
                "conflict_id": f"conf_{conflict_id:03d}",
                "conflict_type": "RESOURCE_CONFLICT",
                "entity_ids": [t["task_id"] for t in tasks[:min(5, len(tasks))]],
                "section_id": tasks[0]["railway_section_id"],
                "start": _iso(target_start),
                "end": _iso(target_end),
                "severity": "HIGH",
                "description": f"{department} tasks competing for {resource_type} in the same window",
            }
            self.conflicts.append(conflict)
            conflict_id += 1

    def _inject_department_resource_bottlenecks(self) -> None:
        """Create multi-department bottlenecks to simulate operational contention."""
        target_start = self.base_date + timedelta(days=2, hours=9)
        target_end = target_start + timedelta(hours=2)
        for dept in ["ENGINEERING", "TRD", "SNT"]:
            dept_tasks = [
                t for t in self.maintenance_tasks
                if t["department"] == dept and t["status"] == "PLANNED"
            ]
            if not dept_tasks:
                continue
            selected = dept_tasks[:min(4, len(dept_tasks))]
            for task in selected:
                task["requested_start"] = _iso(target_start)
                task["requested_end"] = _iso(target_end)

    def _inject_deadline_situations(self) -> None:
        """Create tasks with imminent deadlines — some feasible, some impossible."""
        conflict_id = len(self.conflicts) + 1
        for i, task in enumerate(self.maintenance_tasks[:4]):
            if i < 2:
                # Tight but feasible: deadline 6h from requested start
                tight_deadline = datetime.fromisoformat(
                    task["requested_start"].replace("Z", "+00:00")
                ) + timedelta(hours=6)
                task["deadline"] = _iso(tight_deadline)
                task["priority_hint"] = "CRITICAL"
            else:
                # Impossible: deadline before task can even start (already passed)
                impossible_deadline = datetime.fromisoformat(
                    task["requested_start"].replace("Z", "+00:00")
                ) - timedelta(hours=2)
                task["deadline"] = _iso(impossible_deadline)
                task["priority_hint"] = "HIGH"

                conflict = {
                    "conflict_id": f"conf_{conflict_id:03d}",
                    "conflict_type": "DEADLINE_CONFLICT",
                    "entity_ids": [task["task_id"]],
                    "section_id": task["railway_section_id"],
                    "start": task["requested_start"],
                    "end": task["deadline"],
                    "severity": "CRITICAL",
                    "description": f"Task {task['task_id']} deadline {task['deadline']} is before requested start {task['requested_start']}",
                }
                self.conflicts.append(conflict)
                conflict_id += 1

    def _inject_shadow_block_opportunities(self) -> None:
        """Create shadow-block candidates from generated compatible tasks instead of fixed section IDs."""
        sb_id = 1

        grouped_by_section = {}
        for task in self.maintenance_tasks:
            if task["status"] != "PLANNED":
                continue
            grouped_by_section.setdefault(task["railway_section_id"], []).append(task)

        for sec_id, sec_tasks in sorted(grouped_by_section.items()):
            if len(sec_tasks) < 2:
                continue

            # Build compatible groups from the generated tasks in this section.
            compatible = []
            for task in sec_tasks:
                for other in sec_tasks:
                    if task["task_id"] >= other["task_id"]:
                        continue
                    if task["department"] == other["department"]:
                        continue
                    if task["safety_class"] == "INTERLOCKING" and other["safety_class"] == "HIGH_SAFETY":
                        continue
                    if task["safety_class"] == "HIGH_SAFETY" and other["safety_class"] == "INTERLOCKING":
                        continue
                    # Same-section tasks with overlapping windows are viable candidates.
                    t1_start = datetime.fromisoformat(task["requested_start"].replace("Z", "+00:00"))
                    t1_end = datetime.fromisoformat(task["requested_end"].replace("Z", "+00:00"))
                    t2_start = datetime.fromisoformat(other["requested_start"].replace("Z", "+00:00"))
                    t2_end = datetime.fromisoformat(other["requested_end"].replace("Z", "+00:00"))
                    if max(t1_start, t2_start) < min(t1_end, t2_end):
                        compatible.append((task, other))
                        if len(compatible) >= 2:
                            break
                if len(compatible) >= 2:
                    break

            if not compatible:
                continue

            primary, secondary = compatible[0]
            group = [primary, secondary]
            night_windows = [
                w for w in self.maintenance_windows
                if w["section_id"] == sec_id and w["window_type"] == "NIGHT"
            ]
            if not night_windows:
                continue
            win = night_windows[0]

            total_duration = sum(t["estimated_duration_minutes"] for t in group)
            sb = {
                "shadow_block_id": f"sb_{sb_id:03d}",
                "primary_task_id": primary["task_id"],
                "participating_task_ids": [t["task_id"] for t in group[1:]],
                "sections": [sec_id],
                "departments": sorted({t["department"] for t in group}),
                "proposed_window_start": win["start"],
                "proposed_window_end": win["end"],
                "estimated_duration_minutes": total_duration,
                "estimated_corridor_occupancy": round(min(total_duration / 360.0, 0.95), 2),
                "potential_time_saving_minutes": self.rng.randint(30, 90),
                "resource_usage": self._aggregate_resources(group),
                "conflict_status": "FEASIBLE",
                "shadow_benefit_score": round(self.rng.uniform(0.65, 0.92), 2),
                "reasons": ["shared corridor", "overlapping maintenance window", "compatible departments"],
            }
            self.shadow_block_candidates.append(sb)
            sb_id += 1

    def _aggregate_resources(self, tasks: list[dict]) -> dict:
        usage: dict[str, int] = {}
        for t in tasks:
            for rr in t.get("required_resources", []):
                rtype = rr["resource_type"].lower()
                usage[rtype] = usage.get(rtype, 0) + rr["count"]
        return usage

    def _inject_unsafe_grouping_cases(self) -> None:
        """
        Create a shadow-block candidate that *looks* feasible (same section,
        overlapping window) but must be REJECTED due to safety incompatibility
        (e.g., combining INTERLOCKING SNT task with HIGH_SAFETY USFD task).
        """
        sb_id = len(self.shadow_block_candidates) + 1
        # Find an interlocking SNT task and a high-safety USFD task
        interlocking_tasks = [t for t in self.maintenance_tasks if t["safety_class"] == "INTERLOCKING"]
        high_safety_tasks = [t for t in self.maintenance_tasks if t["safety_class"] == "HIGH_SAFETY"]

        if not interlocking_tasks or not high_safety_tasks:
            # Force-create them if they don't exist
            if self.maintenance_tasks:
                t1 = copy.deepcopy(self.maintenance_tasks[0])
                t1["task_id"] = "task_unsafe_snt"
                t1["task_type"] = "SNT"
                t1["department"] = "SNT"
                t1["safety_class"] = "INTERLOCKING"
                t1["status"] = "PLANNED"
                self.maintenance_tasks.append(t1)
                interlocking_tasks = [t1]

                t2 = copy.deepcopy(self.maintenance_tasks[1])
                t2["task_id"] = "task_unsafe_usfd"
                t2["task_type"] = "USFD"
                t2["department"] = "ENGINEERING"
                t2["safety_class"] = "HIGH_SAFETY"
                t2["status"] = "PLANNED"
                # Force same section
                t2["railway_section_id"] = t1["railway_section_id"]
                self.maintenance_tasks.append(t2)
                high_safety_tasks = [t2]

        if interlocking_tasks and high_safety_tasks:
            t_snt = interlocking_tasks[0]
            t_usfd = high_safety_tasks[0]
            # Force same section for plausible grouping
            t_usfd_sec = t_snt["railway_section_id"]
            t_usfd["railway_section_id"] = t_usfd_sec

            # Find a night window in that section
            night_wins = [w for w in self.maintenance_windows if w["section_id"] == t_usfd_sec and w["window_type"] == "NIGHT"]
            win = night_wins[0] if night_wins else self.maintenance_windows[0]

            unsafe_sb = {
                "shadow_block_id": f"sb_{sb_id:03d}",
                "primary_task_id": t_snt["task_id"],
                "participating_task_ids": [t_usfd["task_id"]],
                "sections": [t_usfd_sec],
                "departments": [t_snt["department"], t_usfd["department"]],
                "proposed_window_start": win["start"],
                "proposed_window_end": win["end"],
                "estimated_duration_minutes": t_snt["estimated_duration_minutes"] + t_usfd["estimated_duration_minutes"],
                "estimated_corridor_occupancy": round(self.rng.uniform(0.5, 0.8), 2),
                "potential_time_saving_minutes": self.rng.randint(20, 50),
                "resource_usage": {"snt_crew": 1, "usfd_vehicle": 1},
                "conflict_status": "REJECTED",
                "shadow_benefit_score": 0.0,
                "reasons": [
                    "SAFETY_CONFLICT: Cannot combine INTERLOCKING (SNT) and HIGH_SAFETY (USFD) tasks in same block",
                    "Interlocking dependency requires exclusive section control",
                    "High-safety USFD repair incompatible with concurrent interlocking work",
                ],
            }
            self.shadow_block_candidates.append(unsafe_sb)

            # Also record the safety conflict
            cid = len(self.conflicts) + 1
            self.conflicts.append({
                "conflict_id": f"conf_{cid:03d}",
                "conflict_type": "SAFETY_CONFLICT",
                "entity_ids": [t_snt["task_id"], t_usfd["task_id"]],
                "section_id": t_usfd_sec,
                "start": win["start"],
                "end": win["end"],
                "severity": "CRITICAL",
                "description": f"Unsafe grouping: INTERLOCKING task {t_snt['task_id']} cannot share block with HIGH_SAFETY task {t_usfd['task_id']}",
            })

    def _inject_emergency_defects(self) -> None:
        """Create emergency events mid-schedule requiring reoptimization."""
        for i in range(2):
            sec_id = self.rng.choice(list(SECTIONS.keys()))
            detected_at = self.base_date + timedelta(days=1, hours=self.rng.randint(5, 12))

            event_type = "NEW_USFD_DEFECT" if i == 0 else "SIGNAL_FAILURE"
            severity = "CRITICAL" if i == 0 else "HIGH"

            event = {
                "event_id": f"emg_{i + 1:03d}",
                "event_type": event_type,
                "section_id": sec_id,
                "affected_asset_id": f"asset_{'rail' if i == 0 else 'signal'}_{self.rng.randint(1, 50):03d}",
                "severity": severity,
                "detected_at": _iso(detected_at),
                "impact_summary": f"{'Critical rail defect' if i == 0 else 'Signal failure'} detected in {'high-traffic' if i == 0 else 'interlocking'} section {sec_id}",
                "related_task_id": None,  # Will be created by emergency engine
            }
            self.emergency_events.append(event)


# ──────────────────────────────────────────────────────────────────────
# CLI entry point
# ──────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate synthetic railway maintenance planning data",
    )
    parser.add_argument("--seed", type=int, default=42, help="Random seed (default: 42)")
    parser.add_argument(
        "--out", type=str, default="ai/data/output",
        help="Output directory for JSON files (default: ai/data/output)",
    )
    args = parser.parse_args()

    gen = SyntheticDataGenerator(seed=args.seed)
    dataset = gen.generate()

    print(f"=== Synthetic Data Generator (seed={args.seed}) ===\n")
    print("Record counts:")
    for name, records in dataset.items():
        print(f"  {name}: {len(records)}")

    files = gen.save_json(args.out)
    print(f"\nFiles written to: {args.out}/")
    for f in files:
        print(f"  {f}")

    # Print sample records
    print("\n=== Sample Records ===\n")
    for entity_name in ["maintenance_tasks", "usfd_defects", "train_movements", "maintenance_windows", "conflicts", "shadow_block_candidates", "emergency_events"]:
        records = dataset[entity_name]
        if records:
            print(f"--- {entity_name} (first record) ---")
            print(json.dumps(records[0], indent=2))
            print()


if __name__ == "__main__":
    main()
