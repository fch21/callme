import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent.parent
ME_DIR = ROOT / "me"
LEADS_FILE = ME_DIR / "leads.jsonl"

load_dotenv(ROOT / ".env")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

ELEVENLABS_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVENLABS_VOICE_ID = os.getenv("ELEVENLABS_VOICE_ID")
VOICE_MODE = os.getenv("VOICE_MODE", "off")

PUSHOVER_USER = os.getenv("PUSHOVER_USER")
PUSHOVER_TOKEN = os.getenv("PUSHOVER_TOKEN")

PERSONA_NAME = os.getenv("PERSONA_NAME", "Fernando")
CHAT_MODEL = os.getenv("CHAT_MODEL", "gpt-5.4-mini")
EVALUATOR_MODEL = os.getenv("EVALUATOR_MODEL", "gpt-5.4-mini")

ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    if o.strip()
]
