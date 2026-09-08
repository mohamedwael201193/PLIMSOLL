from __future__ import annotations

import json
import logging
import sys
from typing import Any


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, Any] = {
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        for key in (
            "request_id",
            "phase",
            "decision_id",
            "snapshot_id",
            "capability",
            "state",
            "error_class",
            "elapsed_ms",
            "classification",
        ):
            if hasattr(record, key):
                payload[key] = getattr(record, key)
        return json.dumps(payload, default=str)


def configure_logging() -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter())
    root = logging.getLogger("plimsoll")
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(f"plimsoll.{name}")
