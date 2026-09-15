from __future__ import annotations

import json
import os
import re
from socket import timeout as SocketTimeout
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class LiveWeatherSource:
    """Optional HTTP-backed weather adapter that conforms to the existing weather-source contract."""

    def __init__(self, endpoint: str | None = None, api_key: str | None = None, timeout: float = 5.0):
        self.endpoint = endpoint or os.getenv("AVIRAT_WEATHER_ENDPOINT")
        self.api_key = api_key or os.getenv("AVIRAT_WEATHER_KEY")
        self.timeout = float(timeout)

    def resolve_weather_context(self, payload: dict[str, Any]) -> Any:
        """Fetch weather context from a configured endpoint and normalize it for the existing risk layer."""
        endpoint = self.endpoint or os.getenv("AVIRAT_WEATHER_ENDPOINT")
        api_key = self.api_key or os.getenv("AVIRAT_WEATHER_KEY")

        if not endpoint or not api_key:
            return "NORMAL"

        request = Request(
            endpoint,
            headers={
                "Accept": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            method="GET",
        )

        try:
            with urlopen(request, timeout=self.timeout) as response:
                if getattr(response, "status", 200) >= 400:
                    return "NORMAL"
                raw = response.read()
                if not raw:
                    return "NORMAL"
                try:
                    payload_obj = json.loads(raw.decode("utf-8"))
                except (TypeError, UnicodeDecodeError, json.JSONDecodeError):
                    return "NORMAL"
                condition = _extract_condition(payload_obj)
                return condition if condition else "NORMAL"
        except Exception:
            return "NORMAL"


def _extract_condition(value: Any) -> str:
    if value is None:
        return "NORMAL"

    if isinstance(value, str):
        return _normalize_condition(value)

    if isinstance(value, dict):
        for key in (
            "weather_context",
            "weather",
            "condition",
            "weather_condition",
            "state",
            "code",
            "value",
            "status",
            "current",
            "forecast",
            "data",
            "summary",
            "main",
            "description",
            "text",
        ):
            if key in value:
                candidate = _extract_condition(value[key])
                if candidate != "NORMAL":
                    return candidate
        for nested_value in value.values():
            candidate = _extract_condition(nested_value)
            if candidate != "NORMAL":
                return candidate
        return "NORMAL"

    if isinstance(value, list):
        for item in value:
            candidate = _extract_condition(item)
            if candidate != "NORMAL":
                return candidate
        return "NORMAL"

    return "NORMAL"


def _normalize_condition(value: str) -> str:
    text = str(value).strip()
    if not text:
        return "NORMAL"

    token = re.sub(r"[^A-Za-z0-9]+", " ", text).strip().upper()
    token = token.replace(" ", "_")
    token = re.sub(r"_+", "_", token)

    if token in {"HIGH_WIND", "STRONG_WIND", "WIND", "WINDY", "GUSTY_WIND", "GUSTS"}:
        return "HIGH_WIND"
    if token in {"LIGHTNING", "THUNDERSTORM", "THUNDER", "STORM", "ELECTRICAL_STORM"}:
        return "LIGHTNING"
    if token in {"HEAVY_RAIN", "RAIN", "RAINY", "DOWNPOUR", "RAINFALL", "PRECIPITATION", "RAIN_STORM"}:
        return "HEAVY_RAIN"
    if token in {"DENSE_FOG", "FOG", "MIST", "HAZE", "DENSE_FOGGY"}:
        return "DENSE_FOG"
    if token in {"NORMAL", "CLEAR", "CLEAR_SKY", "SUNNY", "NONE", "NO_RAIN"}:
        return "NORMAL"

    if any(part in token for part in ("THUNDER", "LIGHTNING", "STORM")):
        return "LIGHTNING"
    if any(part in token for part in ("RAIN", "DRIZZLE", "PRECIP", "DOWNPOUR")):
        return "HEAVY_RAIN"
    if any(part in token for part in ("FOG", "MIST", "HAZE")):
        return "DENSE_FOG"
    if any(part in token for part in ("WIND", "GUST")):
        return "HIGH_WIND"

    return "NORMAL"
