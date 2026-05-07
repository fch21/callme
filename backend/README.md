# CallMe — Backend

FastAPI service. Loads the persona from `../me/`, generates replies through a tool-calling worker + evaluator-optimizer loop, transcribes incoming voice via Whisper, and optionally synthesizes outgoing voice via ElevenLabs.

## Run

```bash
uv sync
uv run uvicorn app.main:app --reload
```

Default port: 8000. Set env vars in the project's root `.env` (see `../.env.example`).

## Test

```bash
uv run pytest
```

## Endpoints

| Method | Path | Body | Returns |
|--------|------|------|---------|
| GET | `/health` | — | `{status, persona, voice_enabled}` |
| POST | `/chat` | `{message, history[], voice?}` | `{reply, audio_b64?}` |
| POST | `/transcribe` | `audio` (multipart file) | `{text}` |
| GET | `/me/photo` | — | image file or 404 |

## Layout

```
app/
├── main.py        # FastAPI app + routes
├── config.py      # env vars + paths
├── persona.py     # loads docs from me/, builds system prompt
├── chat.py        # worker LLM + tool-call loop + retry on rejection
├── evaluator.py   # judge LLM with structured output (Pydantic)
├── tools.py       # function-calling tool: record_user_details (lead capture)
├── notify.py      # Pushover push + me/leads.jsonl logger
├── transcribe.py  # OpenAI Whisper voice-to-text
└── voice.py       # ElevenLabs TTS with tuned VoiceSettings
tests/
└── test_smoke.py
```

## Reply lifecycle

1. **Worker loop** (`chat._run_with_tools`): calls the worker LLM with the persona system prompt + tools schema. Loops while `finish_reason == "tool_calls"`, executing each tool (which writes to `me/leads.jsonl` and pushes via Pushover if configured) and feeding results back.
2. **Judge** (`evaluator.evaluate`): a separate LLM with the same persona context evaluates the worker's final text reply, returning `Evaluation(is_acceptable, feedback)`.
3. **Retry on rejection**: if not acceptable, the worker reruns with the rejected reply + feedback injected into the system prompt.
4. **Voice (optional)**: if `voice.is_enabled()` and the request didn't opt out (`voice: false` for chat-only mode), the final text is synthesized by ElevenLabs and returned as base64 mp3. Failures are logged to stderr and degrade gracefully to text-only.

## Voice input

`/transcribe` accepts an audio blob (webm, mp4, etc.) and forwards it to OpenAI Whisper-1. The frontend records via `MediaRecorder`, posts the blob, gets the text back, and sends it as a normal `/chat` request.

## Pattern reference

The agentic core is the Evaluator-Optimizer pattern (Lab 3 of the OpenAI Agents course) plus tool calling (Lab 4), implemented from scratch with direct OpenAI API calls — no agent framework. See [README.md](../README.md) for the full architectural diagram.
