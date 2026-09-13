"""
Contract Validator for AI-RMP Synthetic Data.

Validates every generated record against the field types, required fields,
and enum constraints defined in AI_DOMAIN_CONTRACT.md.

Usage
-----
    from ai.data.validator import ContractValidator

    validator = ContractValidator()
    results = validator.validate_all(dataset)
    validator.print_report(results)
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

# ──────────────────────────────────────────────────────────────────────
# Enum value sets from AI_DOMAIN_CONTRACT.md
# ──────────────────────────────────────────────────────────────────────

TASK_TYPES = {"USFD", "TRD", "SNT", "ENGINEERING", "OTHER"}
DEPARTMENTS = {"ENGINEERING", "P_WAY", "TRD", "SNT", "SIGNALING", "TRACTION", "OTHER"}
TASK_STATUSES = {"PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"}
PRIORITY_HINTS = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}
SAFETY_CLASSES = {"NORMAL", "RESTRICTED", "INTERLOCKING", "HIGH_SAFETY"}
DATA_QUALITIES = {"HIGH", "MEDIUM", "LOW"}

USFD_SEVERITIES = {"MINOR", "MODERATE", "SEVERE", "CRITICAL"}
USFD_DEFECT_TYPES = {"HEAD_SPLIT", "WEB_CRACK", "FISHPLATE", "WELD_DEFECT", "OTHER"}

TRD_ISSUE_TYPES = {
    "OHE_INSPECTION", "CONTACT_WIRE_ISSUE", "OHE_WEAR",
    "THERMOVISION_ANOMALY", "OHE_COMPONENT_REPLACEMENT", "OTHER",
}

SNT_ASSET_GROUPS = {
    "SIGNAL", "TRACK_CIRCUIT", "AXLE_COUNTER",
    "POINT_MACHINE", "INTERLOCKING", "TELECOM", "OTHER",
}
SNT_SAFETY_DEPS = {"NONE", "INTERLOCKING_REQUIRED", "SIGNAL_BLOCK_REQUIRED", "HIGH_SAFETY"}

TRAIN_DIRECTIONS = {"UP", "DOWN", "BOTH"}
SPEED_CLASSES = {"LOW", "MEDIUM", "HIGH", "EXPRESS"}
TRAIN_PRIORITY_CLASSES = {"FREIGHT", "PASSENGER", "SUPERFAST", "EMERGENCY"}

RESOURCE_TYPES = {
    "TRACK_MACHINE", "USFD_VEHICLE", "TOWER_WAGON",
    "SNT_CREW", "ENGINEERING_CREW", "SIGNAL_CREW",
    "TRACTION_SUPPORT", "OTHER",
}
MAINTENANCE_STATUSES = {"AVAILABLE", "BUSY", "UNDER_MAINTENANCE", "UNAVAILABLE"}

WINDOW_TYPES = {"BLOCK", "MIDDAY", "NIGHT", "POSSESSION", "EMERGENCY"}
WINDOW_AVAILABILITIES = {"AVAILABLE", "PARTIAL", "UNAVAILABLE"}

CONFLICT_TYPES = {
    "TRAIN_CONFLICT", "RESOURCE_CONFLICT", "WINDOW_CONFLICT",
    "SAFETY_CONFLICT", "DEADLINE_CONFLICT",
}
CONFLICT_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

EMERGENCY_EVENT_TYPES = {"NEW_USFD_DEFECT", "TRACK_FAILURE", "SIGNAL_FAILURE", "OTHER"}
EMERGENCY_SEVERITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

SHADOW_CONFLICT_STATUSES = {"FEASIBLE", "CONFLICT", "REJECTED"}


# ──────────────────────────────────────────────────────────────────────
# Validation helpers
# ──────────────────────────────────────────────────────────────────────

class ValidationResult:
    """Holds validation pass/fail counts and error messages."""

    def __init__(self, entity_name: str):
        self.entity_name = entity_name
        self.total = 0
        self.passed = 0
        self.failed = 0
        self.errors: list[str] = []

    def record_pass(self) -> None:
        self.total += 1
        self.passed += 1

    def record_fail(self, msg: str) -> None:
        self.total += 1
        self.failed += 1
        self.errors.append(msg)

    @property
    def ok(self) -> bool:
        return self.failed == 0


def _check_required(record: dict, field: str, entity_id: str) -> str | None:
    if field not in record or record[field] is None:
        return f"{entity_id}: missing required field '{field}'"
    return None


def _check_enum(record: dict, field: str, allowed: set, entity_id: str) -> str | None:
    val = record.get(field)
    if val is not None and val not in allowed:
        return f"{entity_id}: field '{field}' value '{val}' not in {allowed}"
    return None


def _check_number_range(record: dict, field: str, low: float, high: float, entity_id: str) -> str | None:
    val = record.get(field)
    if val is not None:
        if not isinstance(val, (int, float)):
            return f"{entity_id}: field '{field}' must be numeric, got {type(val).__name__}"
        if not (low <= val <= high):
            return f"{entity_id}: field '{field}' value {val} outside [{low}, {high}]"
    return None


def _check_datetime(record: dict, field: str, entity_id: str) -> str | None:
    val = record.get(field)
    if val is not None:
        if not isinstance(val, str):
            return f"{entity_id}: field '{field}' must be datetime string, got {type(val).__name__}"
        try:
            datetime.fromisoformat(val.replace("Z", "+00:00"))
        except ValueError:
            return f"{entity_id}: field '{field}' value '{val}' is not valid ISO datetime"
    return None


def _check_synthetic(record: dict, entity_id: str) -> str | None:
    prov = record.get("provenance")
    if prov is not None:
        if not prov.get("is_synthetic"):
            return f"{entity_id}: provenance.is_synthetic must be True"
    return None


def _check_list(record: dict, field: str, entity_id: str) -> str | None:
    val = record.get(field)
    if val is not None and not isinstance(val, list):
        return f"{entity_id}: field '{field}' must be a list"
    return None


# ──────────────────────────────────────────────────────────────────────
# Contract Validator
# ──────────────────────────────────────────────────────────────────────

class ContractValidator:
    """Validate generated synthetic data against AI_DOMAIN_CONTRACT.md."""

    def validate_all(self, dataset: dict[str, list[dict]]) -> dict[str, ValidationResult]:
        results: dict[str, ValidationResult] = {}

        validators = {
            "maintenance_tasks": self._validate_maintenance_task,
            "usfd_defects": self._validate_usfd_defect,
            "trd_tasks": self._validate_trd_task,
            "snt_tasks": self._validate_snt_task,
            "train_movements": self._validate_train_movement,
            "resources": self._validate_resource,
            "maintenance_windows": self._validate_maintenance_window,
            "conflicts": self._validate_conflict,
            "shadow_block_candidates": self._validate_shadow_block,
            "emergency_events": self._validate_emergency_event,
        }

        for entity_name, validator_fn in validators.items():
            records = dataset.get(entity_name, [])
            result = ValidationResult(entity_name)
            for record in records:
                errors = validator_fn(record)
                if errors:
                    for err in errors:
                        result.record_fail(err)
                else:
                    result.record_pass()
            results[entity_name] = result

        return results

    def print_report(self, results: dict[str, ValidationResult]) -> None:
        print("=== Contract Validation Report ===\n")
        all_ok = True
        for name, res in results.items():
            status = "PASS" if res.ok else "FAIL"
            if not res.ok:
                all_ok = False
            print(f"  {name}: {status}  ({res.passed}/{res.total} passed)")
            for err in res.errors[:5]:
                print(f"    ✗ {err}")
            if len(res.errors) > 5:
                print(f"    ... and {len(res.errors) - 5} more errors")
        print()
        print(f"Overall: {'ALL PASSED ✓' if all_ok else 'FAILURES DETECTED ✗'}")

    # ── Per-entity validators ─────────────────────────────────────

    def _validate_maintenance_task(self, r: dict) -> list[str]:
        eid = r.get("task_id", "unknown")
        errors = []
        for f in ["task_id", "task_type", "railway_section_id", "from_km", "to_km",
                   "department", "status", "requested_start", "requested_end",
                   "estimated_duration_minutes", "required_resources", "safety_class"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "task_type", TASK_TYPES, eid),
            _check_enum(r, "department", DEPARTMENTS, eid),
            _check_enum(r, "status", TASK_STATUSES, eid),
            _check_enum(r, "priority_hint", PRIORITY_HINTS, eid),
            _check_enum(r, "safety_class", SAFETY_CLASSES, eid),
            _check_datetime(r, "requested_start", eid),
            _check_datetime(r, "requested_end", eid),
            _check_datetime(r, "deadline", eid),
            _check_number_range(r, "estimated_duration_minutes", 1, 10000, eid),
            _check_number_range(r, "from_km", 0, 1000, eid),
            _check_number_range(r, "to_km", 0, 1000, eid),
            _check_list(r, "required_resources", eid),
            _check_list(r, "tags", eid),
            _check_synthetic(r, eid),
        ]))
        # from_km < to_km
        if r.get("from_km") is not None and r.get("to_km") is not None:
            if r["from_km"] > r["to_km"]:
                errors.append(f"{eid}: from_km ({r['from_km']}) > to_km ({r['to_km']})")
        return errors

    def _validate_usfd_defect(self, r: dict) -> list[str]:
        eid = r.get("defect_id", "unknown")
        errors = []
        for f in ["defect_id", "task_id", "railway_section_id", "km",
                   "severity", "defect_type", "safety_risk", "urgency", "detected_at"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "severity", USFD_SEVERITIES, eid),
            _check_enum(r, "defect_type", USFD_DEFECT_TYPES, eid),
            _check_number_range(r, "safety_risk", 0.0, 1.0, eid),
            _check_number_range(r, "urgency", 0.0, 1.0, eid),
            _check_number_range(r, "confidence", 0.0, 1.0, eid),
            _check_datetime(r, "detected_at", eid),
            _check_datetime(r, "last_inspection_at", eid),
        ]))
        return errors

    def _validate_trd_task(self, r: dict) -> list[str]:
        eid = r.get("trd_task_id", "unknown")
        errors = []
        for f in ["trd_task_id", "maintenance_task_id", "railway_section_id",
                   "inspection_zone", "issue_type", "traction_block_required",
                   "tower_wagon_required", "window_start", "window_end", "department", "priority"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "issue_type", TRD_ISSUE_TYPES, eid),
            _check_enum(r, "department", {"TRD"}, eid),
            _check_number_range(r, "priority", 0.0, 1.0, eid),
            _check_datetime(r, "window_start", eid),
            _check_datetime(r, "window_end", eid),
        ]))
        return errors

    def _validate_snt_task(self, r: dict) -> list[str]:
        eid = r.get("snt_task_id", "unknown")
        errors = []
        for f in ["snt_task_id", "maintenance_task_id", "railway_section_id",
                   "asset_group", "window_start", "window_end", "department",
                   "safety_dependency", "priority"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "asset_group", SNT_ASSET_GROUPS, eid),
            _check_enum(r, "department", {"SNT"}, eid),
            _check_enum(r, "safety_dependency", SNT_SAFETY_DEPS, eid),
            _check_number_range(r, "priority", 0.0, 1.0, eid),
            _check_datetime(r, "window_start", eid),
            _check_datetime(r, "window_end", eid),
        ]))
        return errors

    def _validate_train_movement(self, r: dict) -> list[str]:
        eid = r.get("movement_id", "unknown")
        errors = []
        for f in ["movement_id", "train_id", "section_id", "from_km", "to_km",
                   "movement_start", "movement_end", "direction", "speed_class", "traffic_density"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "direction", TRAIN_DIRECTIONS, eid),
            _check_enum(r, "speed_class", SPEED_CLASSES, eid),
            _check_enum(r, "priority_class", TRAIN_PRIORITY_CLASSES, eid),
            _check_number_range(r, "traffic_density", 0.0, 1.0, eid),
            _check_datetime(r, "movement_start", eid),
            _check_datetime(r, "movement_end", eid),
        ]))
        return errors

    def _validate_resource(self, r: dict) -> list[str]:
        eid = r.get("resource_id", "unknown")
        errors = []
        for f in ["resource_id", "resource_type", "department", "location",
                   "available_windows", "capacity", "is_operational"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "resource_type", RESOURCE_TYPES, eid),
            _check_enum(r, "department", DEPARTMENTS, eid),
            _check_enum(r, "maintenance_status", MAINTENANCE_STATUSES, eid),
            _check_list(r, "available_windows", eid),
            _check_list(r, "skills", eid),
        ]))
        return errors

    def _validate_maintenance_window(self, r: dict) -> list[str]:
        eid = r.get("window_id", "unknown")
        errors = []
        for f in ["window_id", "section_id", "start", "end", "window_type", "availability"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "window_type", WINDOW_TYPES, eid),
            _check_enum(r, "availability", WINDOW_AVAILABILITIES, eid),
            _check_datetime(r, "start", eid),
            _check_datetime(r, "end", eid),
            _check_list(r, "department_compatibility", eid),
        ]))
        return errors

    def _validate_conflict(self, r: dict) -> list[str]:
        eid = r.get("conflict_id", "unknown")
        errors = []
        for f in ["conflict_id", "conflict_type", "entity_ids", "start", "end", "severity", "description"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "conflict_type", CONFLICT_TYPES, eid),
            _check_enum(r, "severity", CONFLICT_SEVERITIES, eid),
            _check_list(r, "entity_ids", eid),
            _check_datetime(r, "start", eid),
            _check_datetime(r, "end", eid),
        ]))
        return errors

    def _validate_shadow_block(self, r: dict) -> list[str]:
        eid = r.get("shadow_block_id", "unknown")
        errors = []
        for f in ["shadow_block_id", "primary_task_id", "participating_task_ids",
                   "sections", "departments", "proposed_window_start", "proposed_window_end",
                   "estimated_duration_minutes", "estimated_corridor_occupancy",
                   "potential_time_saving_minutes", "resource_usage", "conflict_status"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "conflict_status", SHADOW_CONFLICT_STATUSES, eid),
            _check_number_range(r, "estimated_corridor_occupancy", 0.0, 1.0, eid),
            _check_number_range(r, "shadow_benefit_score", 0.0, 1.0, eid),
            _check_datetime(r, "proposed_window_start", eid),
            _check_datetime(r, "proposed_window_end", eid),
            _check_list(r, "participating_task_ids", eid),
            _check_list(r, "sections", eid),
            _check_list(r, "departments", eid),
            _check_list(r, "reasons", eid),
        ]))
        return errors

    def _validate_emergency_event(self, r: dict) -> list[str]:
        eid = r.get("event_id", "unknown")
        errors = []
        for f in ["event_id", "event_type", "section_id", "severity",
                   "detected_at", "impact_summary"]:
            e = _check_required(r, f, eid)
            if e:
                errors.append(e)
        errors.extend(filter(None, [
            _check_enum(r, "event_type", EMERGENCY_EVENT_TYPES, eid),
            _check_enum(r, "severity", EMERGENCY_SEVERITIES, eid),
            _check_datetime(r, "detected_at", eid),
        ]))
        return errors
