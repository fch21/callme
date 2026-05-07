# CallMe — Backend

FastAPI service. Loads the persona from `../me/`, generates replies through a tool-calling worker + evaluator-optimizer loop, and optionally synthesizes voice via ElevenLabs.

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
| POST | `/chat` | `{message, history[]}` | `{reply, audio_b64?}` |
| GET | `/me/photo` | — | image file or 404 |

## Layout

```
app/
├── main.py        # FastAPI app + routes
├── config.py      # env vars + paths
├── persona.py     # loads PDF + summary, builds system prompt
├── chat.py        # worker LLM + tool-call loop + retry on rejection
├── evaluator.py   # judge LLM with structured output
├── tools.py       # function-calling tool: record_user_details (lead capture)
├── notify.py      # Pushover push + me/leads.jsonl logger
└── voice.py       # ElevenLabs TTS
tests/
└── test_smoke.py
```

## Reply lifecycle

1. **Worker loop** (`chat._run_with_tools`): calls the worker LLM with the persona system prompt + tools schema. Loops while `finish_reason == "tool_calls"`, executing each tool (which writes to `me/leads.jsonl` and pushes via Pushover if configured) and feeding results back.
2. **Judge** (`evaluator.evaluate`): a separate LLM with the same persona context evaluates the worker's final text reply, returning `Evaluation(is_acceptable, feedback)`.
3. **Retry on rejection**: if not acceptable, the worker reruns with the rejected reply + feedback injected into the system prompt.

This is the Evaluator-Optimizer pattern from Week 1 Lab 3 of the OpenAI Agents course, plus the tool-calling extension from Lab 4.
