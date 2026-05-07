import sys
from functools import lru_cache

from elevenlabs.client import ElevenLabs

from .config import ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID, VOICE_MODE


def is_enabled() -> bool:
    return VOICE_MODE != "off" and bool(ELEVENLABS_API_KEY) and bool(ELEVENLABS_VOICE_ID)


@lru_cache(maxsize=1)
def _client() -> ElevenLabs:
    return ElevenLabs(api_key=ELEVENLABS_API_KEY)


def synthesize(text: str) -> bytes:
    try:
        stream = _client().text_to_speech.convert(
            voice_id=ELEVENLABS_VOICE_ID,
            text=text,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        return b"".join(stream)
    except Exception as exc:
        print(
            f"[voice] ElevenLabs synthesis failed: {type(exc).__name__}: {exc}",
            file=sys.stderr,
            flush=True,
        )
        raise
