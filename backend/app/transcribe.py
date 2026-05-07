import sys
from functools import lru_cache

from openai import OpenAI

from . import config

_MODEL = "whisper-1"


@lru_cache(maxsize=1)
def _client() -> OpenAI:
    return OpenAI(api_key=config.OPENAI_API_KEY)


def transcribe(audio_bytes: bytes, filename: str) -> str:
    try:
        response = _client().audio.transcriptions.create(
            model=_MODEL,
            file=(filename, audio_bytes),
        )
        return (response.text or "").strip()
    except Exception as exc:
        print(
            f"[transcribe] Whisper failed: {type(exc).__name__}: {exc}",
            file=sys.stderr,
            flush=True,
        )
        raise
