import json
import time

import httpx

from . import config

_PUSHOVER_URL = "https://api.pushover.net/1/messages.json"


def push(message: str) -> None:
    if not (config.PUSHOVER_USER and config.PUSHOVER_TOKEN):
        return
    try:
        httpx.post(
            _PUSHOVER_URL,
            data={
                "user": config.PUSHOVER_USER,
                "token": config.PUSHOVER_TOKEN,
                "message": message,
            },
            timeout=5.0,
        )
    except Exception:
        pass


def log_lead(kind: str, **fields) -> None:
    record = {"ts": time.time(), "kind": kind, **fields}
    config.LEADS_FILE.parent.mkdir(parents=True, exist_ok=True)
    with config.LEADS_FILE.open("a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")
