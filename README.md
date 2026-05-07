# CallMe

> Open source AI persona — fork the repo, drop in your LinkedIn PDF and a photo, and host a personal "call" where visitors chat (or talk) with an AI version of you.

## What is this

A small open-source project that lets you put a "Call me" button on your personal site. Visitors click it, get an AI version of you trained on your LinkedIn + a short bio, and can have a real conversation about your background and work — by text, by voice, or both.

## Features

- 💬 **Text chat** with a persona built from any documents you drop in `me/` — LinkedIn PDF, bio, résumé, project list, talks, recommendations, anything
- 🧑‍⚖️ **Evaluator-Optimizer pattern** — a judge LLM reviews each reply; bad ones get retried with feedback
- 🛠️ **Lead capture** — the AI calls `record_user_details` when a visitor expresses clear interest and leaves an email
- 🔔 **Push notifications** (optional) — get pinged on your phone via Pushover; captures also persist to `me/leads.jsonl`
- 📞 **Adaptive UI** — phone-call layout when voice is enabled, regular chat layout when not
- 🔊 **Voice mode** (optional) — ElevenLabs TTS with preset or cloned voices
- 🚀 **Fork in under 30 minutes** — minimal config, gitignored personal data, one-click deploy

## Stack

| Piece | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind |
| Backend | FastAPI (Python 3.11+) |
| LLM | OpenAI (chat + evaluator) |
| Voice (optional) | ElevenLabs |
| Persona source | Any `.pdf`, `.txt`, `.md` in `me/` (e.g. `linkedin.pdf`, `summary.txt`, `projects.md`, `talks.md`) |

## Quick start

```bash
git clone https://github.com/<your-username>/callme.git
cd callme

cp .env.example .env        # then fill in OPENAI_API_KEY and PERSONA_NAME
# put your linkedin.pdf, summary.txt, photo.jpg in me/

cd backend && uv sync && uv run uvicorn app.main:app --reload
# (new terminal)
cd frontend && npm install && npm run dev
```

Open [localhost:3000](http://localhost:3000) and click **Call**.

Detailed walk-through: [docs/SETUP.md](docs/SETUP.md).

## Going further

- 🔊 **Add voice**: [docs/VOICE.md](docs/VOICE.md) — preset voices are free; voice cloning starts at $5/mo on ElevenLabs.
- 🔔 **Get notified about visitors**: [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — push notifications via Pushover; leads always logged locally.
- 🚀 **Deploy publicly**: [docs/DEPLOY.md](docs/DEPLOY.md) — Vercel + Render.
- 🤝 **Contribute**: [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

```
   user message ──▶ /chat (FastAPI)
                       │
              build_system_prompt(name) — reads me/
                       │
                       ▼
        ┌──── worker LLM (with tools) ──────┐
        │  Loops while finish_reason ==     │
        │  "tool_calls":                    │
        │   • record_user_details(email)    │
        │  Each call → Pushover + leads.jsonl│
        │  Exits with final text reply.     │
        └─────────────┬──────────────────────┘
                      ▼
        ┌──── judge LLM (Evaluator) ────────┐
        │  Returns Evaluation(              │
        │    is_acceptable, feedback)       │
        └─────────────┬──────────────────────┘
                      │
         ┌────────────┴─────────────┐
         ▼                          ▼
    acceptable                  rejected
    return reply              retry worker with feedback
                              injected into system prompt
                      ▼
       (optional) ElevenLabs TTS → audio_b64
                      ▼
         return { reply, audio_b64 }
```

## Roadmap

- [x] **M1** — Text chat with persona loaded from PDF + summary
- [x] **M2** — Evaluator-Optimizer pattern (OpenAI judge + retry)
- [x] **M3** — Adaptive UI (phone-call layout when voice on, chat layout when off)
- [x] **M4** — Voice mode v1: ElevenLabs TTS playback (preset or cloned)
- [x] **M5** — Voice cloning support (same code path, just a different voice ID)
- [x] **M6** — Lead capture tool: record visitor emails when interest is shown, with Pushover notifications
- [x] **M7** — Deploy configs (Render + Vercel + Dockerfile)
- [x] **M8** — OSS polish (CONTRIBUTING, docs, CI)
- [ ] **Future**: streaming TTS for lower latency
- [ ] **Future**: voice input (Whisper STT) for true voice-only calls
- [ ] **Future**: persistent leads storage (Supabase / Postgres) for production deploys

## License

MIT — see [LICENSE](LICENSE).
