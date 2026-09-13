"""
Criticality Scoring Engine — Rule-Based MVP

Implements the deterministic, explainable criticality scorer defined in
OPTIMIZATION_CONTRACT.md §2 and AI_DOMAIN_CONTRACT.md §9.

Scoring formula (rule-based MVP)
--------------------------------
    score = w_sev * severity_num
          + w_urg * urgency
          + w_saf * safety_risk
          + w_trf * traffic_density
          + w_spd * speed_class_num
          + w_ddl * deadline_proximity

All weights sum to 1.0. Each feature contribution is the weighted term.

Priority mapping (from contract)
--------------------------------
    score >= 0.85  → P1
    0.70 <= score  → P2
    0.50 <= score  → P3
    score < 0.50   → P4

Risk level mapping
------------------
    score >= 0.85  → CRITICAL
    0.70 <= score  → HIGH
    0.50 <= score  → MEDIUM
    score < 0.50   → LOW

Usage
-----
    from ai.criticality.engine import CriticalityEngine

    engine = CriticalityEngine()

    result = engine.score({
        "entity_id": "usfd_101",
        "severity": "CRITICAL",
        "urgency": 0.93,
        "safety_risk": 0.97,
        "traffic_density": 0.83,
        "speed_class": "HIGH",
        "deadline": "2026-11-04T18:00:00Z",  # optional
    })

    print(result["score"])            # 0.0–1.0
    print(result["priority_class"])   # P1
    print(result["explanation"])      # deterministic, grounded text
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

# ──────────────────────────────────────────────────────────────────────
# Constants
# ──────────────────────────────────────────────────────────────────────

MODEL_VERSION = "criticality_v1_rule_2026Q4"

# Weights — sum to 1.0
# User requirement: NO department factor.  The 6 features from the contract
# specification each receive a weight reflecting their domain importance.
WEIGHTS = {
    "severity":           0.28,
    "urgency":            0.22,
    "safety_risk":        0.22,
    "traffic_density":    0.12,
    "speed_class":        0.08,
    "deadline_proximity": 0.08,
}

# Enum → numeric mappings (normalised to 0–1)
SEVERITY_MAP: dict[str, float] = {
    "MINOR":    0.15,
    "MODERATE": 0.45,
    "SEVERE":   0.75,
    "CRITICAL": 1.00,
}

SPEED_CLASS_MAP: dict[str, float] = {
    "LOW":     0.20,
    "MEDIUM":  0.45,
    "HIGH":    0.75,
    "EXPRESS": 1.00,
}

# Priority thresholds (from contract)
_P1_THRESHOLD = 0.85
_P2_THRESHOLD = 0.70
_P3_THRESHOLD = 0.50

# Labels used in explanations
_SEVERITY_LABELS: dict[str, str] = {
    "MINOR": "minor",
    "MODERATE": "moderate",
    "SEVERE": "severe",
    "CRITICAL": "critical",
}

_SPEED_LABELS: dict[str, str] = {
    "LOW": "low-speed",
    "MEDIUM": "medium-speed",
    "HIGH": "high-speed",
    "EXPRESS": "express",
}


# ──────────────────────────────────────────────────────────────────────
# Engine
# ──────────────────────────────────────────────────────────────────────

class CriticalityEngine:
    """
    Deterministic, rule-based criticality scorer.

    Produces a ``CriticalityScore`` dict compliant with
    AI_DOMAIN_CONTRACT.md §9 for every input.  All decisions are
    traceable to weighted feature values — no LLM or ML model involved.
    """

    def __init__(self, weights: dict[str, float] | None = None):
        """
        Parameters
        ----------
        weights : dict, optional
            Override the default weight vector.  Keys must match the six
            feature names.  Values should sum to 1.0.
        """
        self.weights = dict(WEIGHTS)
        if weights is not None:
            for k in WEIGHTS:
                if k in weights:
                    self.weights[k] = weights[k]

    # ── Public API ────────────────────────────────────────────────

    def score(
        self,
        inputs: dict[str, Any],
        *,
        reference_time: datetime | None = None,
    ) -> dict[str, Any]:
        """
        Compute a criticality score for a task or defect.

        Parameters
        ----------
        inputs : dict
            Must contain ``entity_id``.  Should contain as many of the
            six scoring features as available.  Missing or invalid
            features are safely defaulted (see ``_safe_*`` helpers).
        reference_time : datetime, optional
            "Now" for deadline proximity.  Defaults to UTC now.

        Returns
        -------
        dict
            A ``CriticalityScore`` per AI_DOMAIN_CONTRACT.md §9.
        """
        if reference_time is None:
            reference_time = datetime.now(timezone.utc)

        entity_id = str(inputs.get("entity_id", "unknown"))

        # ── Extract & normalise features ──────────────────────────
        sev_raw    = inputs.get("severity")
        urg_raw    = inputs.get("urgency")
        saf_raw    = inputs.get("safety_risk")
        trf_raw    = inputs.get("traffic_density")
        spd_raw    = inputs.get("speed_class")
        ddl_raw    = inputs.get("deadline")

        sev_num = self._safe_severity(sev_raw)
        urg_num = self._safe_numeric(urg_raw, default=0.5)
        saf_num = self._safe_numeric(saf_raw, default=0.5)
        trf_num = self._safe_numeric(trf_raw, default=0.5)
        spd_num = self._safe_speed_class(spd_raw)
        ddl_num = self._safe_deadline_proximity(ddl_raw, reference_time)

        # ── Weighted score ────────────────────────────────────────
        w = self.weights
        contributions = {
            "severity":           round(w["severity"]           * sev_num, 4),
            "urgency":            round(w["urgency"]            * urg_num, 4),
            "safety_risk":        round(w["safety_risk"]        * saf_num, 4),
            "traffic_density":    round(w["traffic_density"]    * trf_num, 4),
            "speed_class":        round(w["speed_class"]        * spd_num, 4),
            "deadline_proximity": round(w["deadline_proximity"] * ddl_num, 4),
        }
        raw_score = sum(contributions.values())
        score = self._clamp(round(raw_score, 4))

        # ── Derived fields ────────────────────────────────────────
        priority_class = self._priority_class(score)
        risk_level     = self._risk_level(score)
        confidence     = self._confidence(inputs)
        explanation    = self._build_explanation(
            entity_id, score, priority_class, risk_level,
            contributions, sev_raw, spd_raw, ddl_raw,
            urg_num, saf_num, trf_num, ddl_num,
        )

        return {
            "entity_id":             entity_id,
            "score":                 score,
            "priority_class":        priority_class,
            "risk_level":            risk_level,
            "feature_contributions": contributions,
            "explanation":           explanation,
            "model_version":         MODEL_VERSION,
            "confidence":            confidence,
            "scoring_mode":          "RULE_BASED",
        }

    def score_batch(
        self,
        items: list[dict[str, Any]],
        *,
        reference_time: datetime | None = None,
    ) -> list[dict[str, Any]]:
        """Score a list of inputs. Returns list of CriticalityScore dicts."""
        return [self.score(item, reference_time=reference_time) for item in items]

    # ── Feature normalisation (safe) ──────────────────────────────

    @staticmethod
    def _safe_severity(val: Any) -> float:
        """Map severity enum to 0–1; default 0.5 for unknown."""
        if isinstance(val, str):
            return SEVERITY_MAP.get(val.upper(), 0.5)
        return 0.5

    @staticmethod
    def _safe_speed_class(val: Any) -> float:
        """Map speed_class enum to 0–1; default 0.5 for unknown."""
        if isinstance(val, str):
            return SPEED_CLASS_MAP.get(val.upper(), 0.5)
        return 0.5

    @staticmethod
    def _safe_numeric(val: Any, *, default: float = 0.5) -> float:
        """Clamp a numeric input to [0, 1]; default on bad input."""
        if val is None:
            return default
        try:
            v = float(val)
        except (TypeError, ValueError):
            return default
        return max(0.0, min(1.0, v))

    @staticmethod
    def _safe_deadline_proximity(
        deadline: Any,
        reference_time: datetime,
    ) -> float:
        """
        Convert a deadline datetime into a 0–1 proximity score.

        - Already past (overdue) → 1.0 (maximum urgency)
        - Within 6 hours         → 0.9
        - Within 24 hours        → 0.7
        - Within 72 hours        → 0.4
        - Beyond 72 hours        → 0.1
        - No deadline            → 0.0 (no time pressure)
        """
        if deadline is None:
            return 0.0
        if isinstance(deadline, str):
            try:
                deadline = datetime.fromisoformat(
                    deadline.replace("Z", "+00:00")
                )
            except (ValueError, TypeError):
                return 0.0
        if not isinstance(deadline, datetime):
            return 0.0

        # Make reference_time timezone-aware if needed
        if reference_time.tzinfo is None:
            reference_time = reference_time.replace(tzinfo=timezone.utc)
        if deadline.tzinfo is None:
            deadline = deadline.replace(tzinfo=timezone.utc)

        hours_remaining = (deadline - reference_time).total_seconds() / 3600.0

        if hours_remaining <= 0:
            return 1.0   # overdue
        elif hours_remaining <= 6:
            return 0.9
        elif hours_remaining <= 24:
            return 0.7
        elif hours_remaining <= 72:
            return 0.4
        else:
            return 0.1

    # ── Score → classification ────────────────────────────────────

    @staticmethod
    def _priority_class(score: float) -> str:
        if score >= _P1_THRESHOLD:
            return "P1"
        elif score >= _P2_THRESHOLD:
            return "P2"
        elif score >= _P3_THRESHOLD:
            return "P3"
        else:
            return "P4"

    @staticmethod
    def _risk_level(score: float) -> str:
        if score >= _P1_THRESHOLD:
            return "CRITICAL"
        elif score >= _P2_THRESHOLD:
            return "HIGH"
        elif score >= _P3_THRESHOLD:
            return "MEDIUM"
        else:
            return "LOW"

    @staticmethod
    def _clamp(v: float) -> float:
        return max(0.0, min(1.0, v))

    # ── Confidence heuristic ──────────────────────────────────────

    @staticmethod
    def _confidence(inputs: dict) -> float:
        """
        Heuristic confidence based on how many features were provided.
        More features → higher confidence.
        """
        present = 0
        for key in ("severity", "urgency", "safety_risk",
                     "traffic_density", "speed_class", "deadline"):
            if inputs.get(key) is not None:
                present += 1
        # 6 features → 0.95; 0 features → 0.50
        return round(0.50 + (present / 6) * 0.45, 2)

    # ── Explanation builder ───────────────────────────────────────

    @staticmethod
    def _build_explanation(
        entity_id: str,
        score: float,
        priority_class: str,
        risk_level: str,
        contributions: dict[str, float],
        sev_raw: Any,
        spd_raw: Any,
        ddl_raw: Any,
        urg_num: float,
        saf_num: float,
        trf_num: float,
        ddl_num: float,
    ) -> str:
        """Build a deterministic, human-readable explanation grounded in input values."""
        # Sort features by contribution (descending)
        ranked = sorted(contributions.items(), key=lambda kv: kv[1], reverse=True)
        top_features = ranked[:3]

        parts: list[str] = []

        # Opening sentence with classification
        parts.append(
            f"Entity {entity_id} scored {score:.2f} "
            f"(priority {priority_class}, risk {risk_level})."
        )

        # Top contributing features
        feature_descs: list[str] = []
        for fname, fval in top_features:
            desc = _feature_description(
                fname, fval, sev_raw, spd_raw, ddl_raw,
                urg_num, saf_num, trf_num, ddl_num,
            )
            if desc:
                feature_descs.append(desc)

        if feature_descs:
            parts.append(
                "Top contributing factors: " + "; ".join(feature_descs) + "."
            )

        # Deadline note
        if ddl_raw is not None and ddl_num >= 0.7:
            parts.append(
                f"Deadline pressure is {'extreme (overdue)' if ddl_num >= 1.0 else 'high'}, "
                f"contributing {contributions['deadline_proximity']:.4f} to the score."
            )
        elif ddl_raw is None:
            parts.append("No deadline was specified; deadline proximity did not contribute.")

        return " ".join(parts)


# ──────────────────────────────────────────────────────────────────────
# Explanation helper
# ──────────────────────────────────────────────────────────────────────

def _feature_description(
    fname: str,
    fval: float,
    sev_raw: Any,
    spd_raw: Any,
    ddl_raw: Any,
    urg_num: float,
    saf_num: float,
    trf_num: float,
    ddl_num: float,
) -> str:
    """Return a short human phrase for a scored feature."""
    if fname == "severity":
        label = _SEVERITY_LABELS.get(str(sev_raw).upper(), str(sev_raw))
        return f"severity={label} (contributed {fval:.4f})"
    elif fname == "urgency":
        return f"urgency={urg_num:.2f} (contributed {fval:.4f})"
    elif fname == "safety_risk":
        return f"safety_risk={saf_num:.2f} (contributed {fval:.4f})"
    elif fname == "traffic_density":
        return f"traffic_density={trf_num:.2f} (contributed {fval:.4f})"
    elif fname == "speed_class":
        label = _SPEED_LABELS.get(str(spd_raw).upper(), str(spd_raw))
        return f"speed_class={label} (contributed {fval:.4f})"
    elif fname == "deadline_proximity":
        return f"deadline_proximity={ddl_num:.1f} (contributed {fval:.4f})"
    return ""
