from __future__ import annotations

import json
import logging
import os
import random
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib import error, request

from ai.data.generator import SyntheticDataGenerator

logger = logging.getLogger(__name__)

DEFAULT_EVENT_INTERVAL_SECONDS = int(os.getenv("EVENT_INTERVAL_SECONDS", "20"))
DEFAULT_EVENT_TIMEOUT_SECONDS = int(os.getenv("AVIRAT_EVENT_TIMEOUT_SECONDS", "10"))
DEFAULT_BASE_URL = os.getenv("AVIRAT_EVENT_BASE_URL", "http://localhost:3000")
EVENT_TYPES = (
    "maintenance_task",
    "train_movement_forecast",
    "block_window_update",
)


class LiveSyntheticEventSimulator:
    """Continuously emits a single synthetic railway event at a time."""

    def __init__(
        self,
        *,
        base_url: str = DEFAULT_BASE_URL,
        interval_seconds: int = DEFAULT_EVENT_INTERVAL_SECONDS,
        seed: int = 42,
        request_timeout_seconds: int = DEFAULT_EVENT_TIMEOUT_SECONDS,
    ):
        self.base_url = base_url.rstrip("/")
        self.interval_seconds = max(1, int(interval_seconds))
        self.request_timeout_seconds = max(1, int(request_timeout_seconds))
        self.seed = int(seed)
        self.generator = SyntheticDataGenerator(seed=self.seed)
        self.dataset = self.generator.generate()
        self.event_index = 0

    def _now_iso(self) -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    def _choose_event_type(self) -> str:
        return EVENT_TYPES[self.event_index % len(EVENT_TYPES)]

    def _build_event_payload(self, event_type: str) -> tuple[str, str, dict[str, Any]]:
        if event_type == "maintenance_task":
            task = self.dataset["maintenance_tasks"][self.event_index % len(self.dataset["maintenance_tasks"])]
            payload = dict(task)
            endpoint = f"{self.base_url}/api/integration/tms/maintenance"
            event_id = str(payload.get("task_id", f"task_{self.event_index:04d}"))
            return event_id, endpoint, payload

        if event_type == "train_movement_forecast":
            movement = self.dataset["train_movements"][self.event_index % len(self.dataset["train_movements"])]
            payload = {
                "movement_id": movement.get("movement_id"),
                "train_id": movement.get("train_id"),
                "section_id": movement.get("section_id"),
                "direction": movement.get("direction"),
                "speed_class": movement.get("speed_class"),
                "traffic_density": movement.get("traffic_density"),
                "movement_start": movement.get("movement_start"),
                "movement_end": movement.get("movement_end"),
                "priority_class": movement.get("priority_class"),
            }
            endpoint = (
                f"{self.base_url}/api/integration/coa/train"
                if self.event_index % 2 == 0
                else f"{self.base_url}/api/integration/coa/forecast"
            )
            event_id = str(payload.get("movement_id", f"mv_{self.event_index:04d}"))
            return event_id, endpoint, payload

        window = self.dataset["maintenance_windows"][self.event_index % len(self.dataset["maintenance_windows"])]
        payload = dict(window)
        endpoint = f"{self.base_url}/api/integration/coa/block-window"
        event_id = str(payload.get("window_id", f"win_{self.event_index:04d}"))
        return event_id, endpoint, payload

    def generate_event(self) -> dict[str, Any]:
        event_type = self._choose_event_type()
        event_id, endpoint, payload = self._build_event_payload(event_type)
        event = {
            "event_type": event_type,
            "event_id": event_id,
            "endpoint": endpoint,
            "payload": payload,
            "timestamp": self._now_iso(),
            "seed": self.seed,
        }
        self.event_index += 1
        return event

    def send_event(self, event: dict[str, Any]) -> bool:
        try:
            payload = json.dumps(event["payload"]).encode("utf-8")
            req = request.Request(
                event["endpoint"],
                data=payload,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with request.urlopen(req, timeout=self.request_timeout_seconds) as response:
                response.read()
            return True
        except Exception:
            logger.warning("Synthetic event POST failed for %s at %s", event.get("event_id"), event.get("endpoint"), exc_info=True)
            return False

    def run_once(self) -> dict[str, Any]:
        event = self.generate_event()
        success = self.send_event(event)
        print(f"event={event['event_type']} id={event['event_id']} timestamp={event['timestamp']} endpoint={event['endpoint']} success={success}")
        event["success"] = success
        return event

    def run_forever(self) -> None:
        stop_requested = {"value": False}

        def handle_sigint(signum, frame):
            stop_requested["value"] = True

        signal.signal(signal.SIGINT, handle_sigint)
        try:
            while not stop_requested["value"]:
                self.run_once()
                time.sleep(self.interval_seconds)
        except KeyboardInterrupt:
            stop_requested["value"] = True
        finally:
            print("Stopping live synthetic event simulator.")


def main() -> int:
    base_url = os.getenv("AVIRAT_EVENT_BASE_URL", DEFAULT_BASE_URL)
    interval = int(os.getenv("EVENT_INTERVAL_SECONDS", str(DEFAULT_EVENT_INTERVAL_SECONDS)))
    seed = int(os.getenv("AVIRAT_EVENT_SEED", "42"))

    simulator = LiveSyntheticEventSimulator(base_url=base_url, interval_seconds=interval, seed=seed)
    simulator.run_forever()
    return 0


if __name__ == "__main__":
    sys.exit(main())
