from __future__ import annotations

import os
import socket
import unittest
from unittest.mock import patch

from ai.criticality.engine import CriticalityEngine
from ai.criticality.live_weather import LiveWeatherSource
from ai.criticality.weather_risk import SyntheticWeatherSource


class _FakeResponse:
    def __init__(self, body: bytes, status: int = 200):
        self._body = body
        self.status = status

    def read(self) -> bytes:
        return self._body

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        return False


class TestLiveWeatherSource(unittest.TestCase):
    def test_valid_response_parsing(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", return_value=_FakeResponse(b'{"weather": [{"main": "Rain"}]}')):
            result = source.resolve_weather_context({})
        self.assertEqual(result, "HEAVY_RAIN")

    def test_missing_configuration(self):
        with patch.dict(os.environ, {}, clear=True):
            source = LiveWeatherSource()
            self.assertEqual(source.resolve_weather_context({}), "NORMAL")

    def test_timeout_safe_fallback(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", side_effect=socket.timeout("timed out")):
            result = source.resolve_weather_context({})
        self.assertEqual(result, "NORMAL")

    def test_http_failure_safe_fallback(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", side_effect=Exception("http failure")):
            result = source.resolve_weather_context({})
        self.assertEqual(result, "NORMAL")

    def test_malformed_response_safe_fallback(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", return_value=_FakeResponse(b'{oops')):
            result = source.resolve_weather_context({})
        self.assertEqual(result, "NORMAL")

    def test_deterministic_normalized_output(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", return_value=_FakeResponse(b'{"weather": [{"description": "High wind gusts"}]}')):
            first = source.resolve_weather_context({})
        with patch("ai.criticality.live_weather.urlopen", return_value=_FakeResponse(b'{"weather": [{"description": "WIND"}]}')):
            second = source.resolve_weather_context({})
        self.assertEqual(first, "HIGH_WIND")
        self.assertEqual(second, "HIGH_WIND")

    def test_safe_normal_fallback_for_clear_sky(self):
        source = LiveWeatherSource(endpoint="https://example.test/weather", api_key="secret")
        with patch("ai.criticality.live_weather.urlopen", return_value=_FakeResponse(b'{"weather": [{"main": "Clear"}]}')):
            result = source.resolve_weather_context({})
        self.assertEqual(result, "NORMAL")

    def test_configured_endpoint_selects_live_weather_source(self):
        with patch.dict(os.environ, {"AVIRAT_WEATHER_ENDPOINT": "https://example.test/weather"}, clear=True):
            engine = CriticalityEngine()
        self.assertIsInstance(engine.weather_source, LiveWeatherSource)

    def test_missing_endpoint_keeps_synthetic_weather_source(self):
        with patch.dict(os.environ, {}, clear=True):
            engine = CriticalityEngine()
        self.assertIsInstance(engine.weather_source, SyntheticWeatherSource)

    def test_explicit_weather_source_takes_precedence(self):
        explicit = object()
        engine = CriticalityEngine(weather_source=explicit)
        self.assertIs(engine.weather_source, explicit)

    def test_live_weather_failure_does_not_crash_criticality(self):
        with patch.dict(os.environ, {"AVIRAT_WEATHER_ENDPOINT": "https://example.test/weather", "AVIRAT_WEATHER_KEY": "secret"}, clear=True):
            engine = CriticalityEngine()
        with patch("ai.criticality.live_weather.urlopen", side_effect=ValueError("live weather failed")):
            result = engine.score({
                "entity_id": "weather_fail_001",
                "severity": "SEVERE",
                "urgency": 0.7,
                "safety_risk": 0.6,
                "traffic_density": 0.5,
                "speed_class": "HIGH",
                "weather_context": "HIGH_WIND",
            })
        self.assertEqual(result["weather_risk_level"], "NORMAL")


if __name__ == "__main__":
    unittest.main(verbosity=2)
