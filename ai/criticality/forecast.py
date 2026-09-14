from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

SEVERITY_MAP = {
    "MINOR": 0.15,
    "MODERATE": 0.45,
    "SEVERE": 0.75,
    "CRITICAL": 1.00,
}

SPEED_CLASS_MAP = {
    "LOW": 0.20,
    "MEDIUM": 0.45,
    "HIGH": 0.75,
    "EXPRESS": 1.00,
}


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(upper, value))


def _to_float(value: Any, default: float = 0.5) -> float:
    if value is None:
        return default
    try:
        return _clamp(float(value), 0.0, 1.0)
    except (TypeError, ValueError):
        return default


def _normalize_severity(value: Any) -> float:
    if isinstance(value, str):
        return SEVERITY_MAP.get(value.upper(), 0.45)
    return 0.45


def _normalize_speed(value: Any) -> float:
    if isinstance(value, str):
        return SPEED_CLASS_MAP.get(value.upper(), 0.45)
    return 0.45


def _normalize_text_severity(value: Any) -> float:
    if value is None:
        return 0.5
    try:
        return _clamp(float(value) / 10.0, 0.0, 1.0)
    except (TypeError, ValueError):
        return 0.5


def _parse_deadline(deadline: Any) -> datetime | None:
    if deadline is None:
        return None
    if isinstance(deadline, datetime):
        return deadline
    if isinstance(deadline, str):
        try:
            return datetime.fromisoformat(deadline.replace("Z", "+00:00"))
        except ValueError:
            return None
    return None


def _deadline_proximity(deadline: Any, reference_time: datetime) -> float:
    dt = _parse_deadline(deadline)
    if dt is None:
        return 0.0
    if reference_time.tzinfo is None:
        reference_time = reference_time.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    hours_remaining = (dt - reference_time).total_seconds() / 3600.0
    if hours_remaining <= 0:
        return 1.0
    if hours_remaining <= 6:
        return 0.9
    if hours_remaining <= 24:
        return 0.7
    if hours_remaining <= 72:
        return 0.4
    return 0.1


def _priority_from_score(score: float) -> str:
    if score >= 0.85:
        return "P1"
    if score >= 0.70:
        return "P2"
    if score >= 0.50:
        return "P3"
    return "P4"


def _priority_rank(priority: str) -> int:
    return {"P4": 0, "P3": 1, "P2": 2, "P1": 3}[priority]


def _build_reason(current_score: float, forecast_score: float, current_priority: str, forecast_priority: str, horizon_days: int, crossing: bool) -> str:
    if crossing:
        return (
            f"Projected criticality rises from {current_score:.2f} ({current_priority}) to {forecast_score:.2f} ({forecast_priority}) "
            f"over {horizon_days} day(s), indicating a threshold crossing."
        )
    return (
        f"Projected criticality remains {forecast_score:.2f} ({forecast_priority}) over {horizon_days} day(s); "
        f"current score is {current_score:.2f} ({current_priority})."
    )


def _current_score(inputs: dict[str, Any], *, reference_time: datetime | None = None) -> float:
    if reference_time is None:
        reference_time = datetime.now(timezone.utc)

    severity = _normalize_severity(inputs.get("severity"))
    urgency = _to_float(inputs.get("urgency"), 0.5)
    safety_risk = _to_float(inputs.get("safety_risk"), 0.5)
    traffic_density = _to_float(inputs.get("traffic_density"), 0.5)
    speed_class = _normalize_speed(inputs.get("speed_class"))
    deadline_proximity = _deadline_proximity(inputs.get("deadline"), reference_time)
    text_severity = _normalize_text_severity(inputs.get("text_severity"))

    score = (
        0.28 * severity
        + 0.22 * urgency
        + 0.22 * safety_risk
        + 0.12 * traffic_density
        + 0.08 * speed_class
        + 0.08 * deadline_proximity
        + 0.10 * text_severity
        + 0.08 * urgency * safety_risk
        + 0.05 * deadline_proximity * traffic_density
    )
    return _clamp(score)


def forecast_task_criticality(inputs: dict[str, Any], horizon_days: int = 7) -> dict[str, Any]:
    """Estimate whether task criticality likely increases over a future horizon."""
    if not isinstance(inputs, dict):
        raise ValueError("Forecast inputs must be a dictionary.")
    if horizon_days < 0:
        raise ValueError("horizon_days must be non-negative.")

    reference_time = datetime.now(timezone.utc)
    current_score = _current_score(inputs, reference_time=reference_time)
    current_priority = _priority_from_score(current_score)

    horizon = max(0, int(horizon_days))
    deadline = inputs.get("deadline")
    deadline_proximity_now = _deadline_proximity(deadline, reference_time)
    if deadline is not None:
        future_time = reference_time + timedelta(days=horizon)
        deadline_proximity_future = _deadline_proximity(deadline, future_time)
    else:
        deadline_proximity_future = 0.0

    urgency = _to_float(inputs.get("urgency"), 0.5)
    safety_risk = _to_float(inputs.get("safety_risk"), 0.5)
    traffic_density = _to_float(inputs.get("traffic_density"), 0.5)
    text_severity = _normalize_text_severity(inputs.get("text_severity"))

    uplift = (
        0.17 * max(0.0, deadline_proximity_future - deadline_proximity_now)
        + 0.12 * max(0.0, urgency - 0.6)
        + 0.10 * max(0.0, safety_risk - 0.6)
        + 0.08 * max(0.0, traffic_density - 0.6)
        + 0.10 * max(0.0, text_severity - 0.5)
    )
    forecast_score = _clamp(current_score + uplift)
    forecast_priority = _priority_from_score(forecast_score)
    crossing = _priority_rank(forecast_priority) > _priority_rank(current_priority)

    return {
        "current_score": round(float(current_score), 6),
        "forecast_score": round(float(forecast_score), 6),
        "forecast_horizon_days": horizon,
        "current_priority": current_priority,
        "forecast_priority": forecast_priority,
        "threshold_crossing": crossing,
        "reason": _build_reason(current_score, forecast_score, current_priority, forecast_priority, horizon, crossing),
    }
