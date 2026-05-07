import base64

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from . import voice
from .chat import reply
from .config import ALLOWED_ORIGINS, ME_DIR, PERSONA_NAME

app = FastAPI(title="CallMe", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: list[ChatMessage] = []
    voice: bool = True


class ChatResponse(BaseModel):
    reply: str
    audio_b64: str | None = None


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "persona": PERSONA_NAME,
        "voice_enabled": voice.is_enabled(),
    }


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest) -> ChatResponse:
    history = [m.model_dump() for m in req.history]
    text = reply(req.message, history)

    audio_b64: str | None = None
    if req.voice and voice.is_enabled():
        try:
            audio_b64 = base64.b64encode(voice.synthesize(text)).decode("ascii")
        except Exception:
            audio_b64 = None

    return ChatResponse(reply=text, audio_b64=audio_b64)


@app.get("/me/photo")
def photo() -> Response:
    for ext in ("jpg", "jpeg", "png", "webp"):
        path = ME_DIR / f"photo.{ext}"
        if path.exists():
            return FileResponse(path)
    return Response(status_code=404)
