from __future__ import annotations

from typing import Any, Iterable, Protocol


class WeatherSource(Protocol):
    def resolve_weather_context(self, payload: dict[str, Any]) -> Any:
        ...


class SyntheticWeatherSource:
    """Small weather-source adapter for deterministic synthetic data."""

    def resolve_weather_context(self, payload: dict[str, Any]) -> Any:
        if not isinstance(payload, dict):
            return None
        for key in ("weather_context", "weather", "weatherCondition", "condition", "weather_state"):
            value = payload.get(key)
            if value is not None:
                return value
        return None


_WEATHER_RULES = {
    "HIGH_WIND": {
        "weather_risk_level": "ELEVATED",
        "weather_risk_reason": "High wind elevates risk for TRD/OHE work due to conductor and equipment exposure.",
        "affected_task_types": ["TRD", "OHE"],
    },
    "LIGHTNING": {
        "weather_risk_level": "ELEVATED",
        "weather_risk_reason": "Lightning elevates risk for TRD/OHE work due to electrical exposure and safety constraints.",
        "affected_task_types": ["TRD", "OHE"],
    },
    "HEAVY_RAIN": {
        "weather_risk_level": "ELEVATED",
        "weather_risk_reason": "Heavy rain elevates risk for P_WAY and earthwork maintenance due to drainage and track stability impacts.",
        "affected_task_types": ["P_WAY", "EARTHWORK"],
    },
    "DENSE_FOG": {
        "weather_risk_level": "WARNING",
        "weather_risk_reason": "Dense fog creates visibility-sensitive train movement conditions and requires caution.",
        "affected_task_types": ["TRAIN_MOVEMENT"],
    },
    "NORMAL": {
        "weather_risk_level": "NORMAL",
        "weather_risk_reason": "No additional weather risk detected.",
        "affected_task_types": [],
    },
}


def _coerce_condition(weather_context: Any) -> str:
    if weather_context is None:
        return "NORMAL"
    if isinstance(weather_context, str):
        value = weather_context.strip().upper()
        if value in _WEATHER_RULES:
            return value
        normalized = value.replace("-", "_").replace(" ", "_")
        if normalized in _WEATHER_RULES:
            return normalized
        return "NORMAL"
    if isinstance(weather_context, dict):
        for key in ("condition", "weather", "weather_condition", "state", "code", "value"):
            candidate = weather_context.get(key)
            if candidate is not None:
                return _coerce_condition(candidate)
        return "NORMAL"
    return "NORMAL"


def evaluate_weather_risk(weather_context: Any, *, task_type: str | None = None) -> dict[str, Any]:
    """Return a deterministic extra-risk signal, never changing the core score."""
    condition = _coerce_condition(weather_context)
    signal = dict(_WEATHER_RULES.get(condition, _WEATHER_RULES["NORMAL"]))

    if signal["weather_risk_level"] == "NORMAL":
        return signal

    task_hint = (task_type or "").upper()
    if task_hint in {"TRD", "OHE"} and condition in {"HIGH_WIND", "LIGHTNING"}:
        return signal
    if task_hint in {"P_WAY", "EARTHWORK"} and condition == "HEAVY_RAIN":
        return signal
    if task_hint == "TRAIN_MOVEMENT" and condition == "DENSE_FOG":
        return signal

    if condition in {"HIGH_WIND", "LIGHTNING"}:
        signal["affected_task_types"] = ["TRD", "OHE"]
    elif condition == "HEAVY_RAIN":
        signal["affected_task_types"] = ["P_WAY", "EARTHWORK"]
    elif condition == "DENSE_FOG":
        signal["affected_task_types"] = ["TRAIN_MOVEMENT"]
    else:
        signal = dict(_WEATHER_RULES["NORMAL"])

    return signal


def _as_weather_signal(payload: dict[str, Any], weather_source: WeatherSource | None = None) -> dict[str, Any]:
    effective_source = weather_source or SyntheticWeatherSource()
    weather_context = effective_source.resolve_weather_context(payload)
    task_type = payload.get("task_or_defect_type") or payload.get("taskType") or payload.get("department")
    return evaluate_weather_risk(weather_context, task_type=str(task_type) if task_type is not None else None)
