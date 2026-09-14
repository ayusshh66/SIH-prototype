from __future__ import annotations

import json
import logging
import os
import re
from typing import Any, Protocol

logger = logging.getLogger(__name__)
DEFAULT_LLM_TIMEOUT_SECONDS = 5.0


class NarrationProvider(Protocol):
    def generate(self, payload: dict[str, Any], *, timeout: float) -> str | None:
        ...


class StructuredNarrationProvider:
    """Small provider interface for optional LLM narration.

    The underlying provider can be replaced later without changing the
    explainability engine itself.
    """

    def __init__(self, client: Any | None = None):
        self.client = client

    def generate(self, payload: dict[str, Any], *, timeout: float) -> str | None:
        if self.client is None:
            return None
        try:
            return self.client.generate(payload, timeout=timeout)
        except Exception:
            return None


class HttpNarrationProvider:
    """Very small optional HTTP-backed provider for real LLM integration."""

    def __init__(self, endpoint: str | None = None, api_key: str | None = None):
        self.endpoint = endpoint or os.getenv("AVIRAT_NARRATION_ENDPOINT")
        self.api_key = api_key or os.getenv("AVIRAT_NARRATION_KEY")

    def generate(self, payload: dict[str, Any], *, timeout: float) -> str | None:
        if not self.endpoint:
            return None

        try:
            import requests
        except Exception:
            logger.warning("LLM narration dependency not available")
            return None

        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = "Bearer <redacted>"

        try:
            response = requests.post(
                self.endpoint,
                json=payload,
                headers=headers,
                timeout=timeout,
            )
            response.raise_for_status()
            data = response.json()
            if isinstance(data, dict):
                for key in ("text", "content", "output", "message"):
                    value = data.get(key)
                    if isinstance(value, str) and value.strip():
                        return value
            if isinstance(data, str):
                return data
        except requests.exceptions.Timeout:
            logger.warning("LLM narration request timed out")
            return None
        except requests.exceptions.RequestException as exc:
            logger.warning("LLM narration request failed: %s", type(exc).__name__)
            return None
        except ValueError:
            logger.warning("LLM narration returned malformed JSON")
            return None
        except Exception:
            logger.warning("LLM narration failed unexpectedly", exc_info=True)
            return None
        return None


def _safe_explanation_payload(explanation: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(explanation, dict):
        return {}

    return {
        "entity_type": explanation.get("entity_type"),
        "entity_id": explanation.get("entity_id"),
        "summary": explanation.get("summary"),
        "reason_codes": explanation.get("reason_codes", []),
        "evidence": explanation.get("evidence", {}),
        "deterministic_inputs": explanation.get("deterministic_inputs", {}),
    }


def _coerce_narration_text(raw: Any) -> str | None:
    if isinstance(raw, str):
        candidate = raw.strip()
        if not candidate:
            return None
        if candidate.startswith("{") or candidate.startswith("["):
            try:
                parsed = json.loads(candidate)
            except json.JSONDecodeError:
                logger.warning("LLM narration returned malformed JSON payload")
                return None
            if isinstance(parsed, dict):
                for key in ("text", "content", "output", "message"):
                    value = parsed.get(key)
                    if isinstance(value, str) and value.strip():
                        return value.strip()
            if isinstance(parsed, list) and parsed:
                first = parsed[0]
                if isinstance(first, dict):
                    for key in ("text", "content", "output", "message"):
                        value = first.get(key)
                        if isinstance(value, str) and value.strip():
                            return value.strip()
        return candidate

    if isinstance(raw, dict):
        for key in ("text", "content", "output", "message"):
            value = raw.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()

    return None


def _validate_narration(text: str | None, *, source_explanation: dict[str, Any]) -> str | None:
    if not isinstance(text, str):
        return None

    cleaned = text.strip()
    if not cleaned:
        return None

    cleaned = cleaned.replace("```", "").strip()
    if cleaned.lower().startswith("ai narration:"):
        cleaned = cleaned[len("AI narration:") :].strip()
    elif cleaned.lower().startswith("narration:"):
        cleaned = cleaned[len("Narration:") :].strip()

    if not cleaned:
        return None

    sentence_count = len(re.findall(r"[^.!?]+[.!?]?", cleaned))
    if sentence_count < 1 or sentence_count > 2:
        return None

    response_numbers = set(re.findall(r"\d+(?:\.\d+)?", cleaned))
    original_numbers = set(re.findall(r"\d+(?:\.\d+)?", json.dumps(source_explanation, sort_keys=True)))
    if response_numbers - original_numbers:
        return None

    forbidden = ["schedule", "optimize", "safety decision", "compatibility decision", "new plan", "replan"]
    lowered = cleaned.lower()
    if any(token in lowered for token in forbidden):
        return None

    return cleaned


def generate_llm_narration(
    explanation: dict[str, Any],
    provider: NarrationProvider | None = None,
    *,
    timeout: float = DEFAULT_LLM_TIMEOUT_SECONDS,
) -> str | None:
    """Generate a short planner-facing narration from the deterministic explanation.

    The narration is optional and never replaces the underlying explanation.
    Any API or parsing failure returns None.
    """
    if not isinstance(explanation, dict):
        return None
    if provider is None:
        return None

    payload = {
        "system": (
            "You are a railway planner support narrator. "
            "Use only the structured JSON facts provided. "
            "Write exactly 1-2 short sentences. "
            "Do not add facts, numbers, names, or reasons. "
            "Do not schedule, decide safety, compatibility, optimization, or emergency actions. "
            "Do not invent any details. "
            "Keep the text brief and plain."
        ),
        "input_json": _safe_explanation_payload(explanation),
    }

    try:
        raw = provider.generate(payload, timeout=timeout)
    except TimeoutError:
        logger.warning("LLM narration timed out after %.1f seconds", timeout)
        return None
    except Exception:
        logger.warning("LLM narration provider failed", exc_info=True)
        return None

    text = _coerce_narration_text(raw)
    if text is None:
        logger.warning("LLM narration produced no usable text")
        return None

    return _validate_narration(text, source_explanation=explanation)
