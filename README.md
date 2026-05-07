# CallMe

> Open source AI persona. Fork the repo, drop in your LinkedIn PDF and a photo, and host a personal "call" where visitors chat (or talk) with an AI version of you.

## What is this

A small open-source project that puts a "Call me" button on your personal site. Visitors click it, get an AI version of you trained on documents you provide (LinkedIn, CV, bio, projects, anything in `me/`), and can have a real conversation about your background and work, by text or voice.

## Features

- 💬 **Text chat** with a persona built from any documents you drop in `me/` — LinkedIn PDF, bio, résumé, project list, talks, recommendations, anything
- 🎙️ **Voice in / voice out** — talk to the AI with your mic (Whisper transcribes) and the AI replies with TTS audio (ElevenLabs). Press to talk; press again to send.
- 🧑‍⚖️ **Evaluator-Optimizer pattern** — a judge LLM reviews each reply; bad ones get retried with feedback
- 🛠️ **Lead capture** — the AI calls `record_user_details` when a visitor expresses clear interest and leaves an email
- 🔔 **Push notifications** (optional) — get pinged on your phone via Pushover; captures also persist to `me/leads.jsonl`
- 📞 **Adaptive UI** — landing screen lets the visitor pick Call or Chat when voice is configured; auto-routes to chat when it isn't
- ⏸️ **Interruptible playback** — tap the mic during AI speech to interrupt and start your own message
- 🚀 **Fork in under 30 minutes** — minimal config, gitignored personal data, one-command Docker deploy

## Stack

| Piece | Choice |
|-------|--------|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind |
| Backend | FastAPI (Python 3.11+) |
| LLM (chat + judge) | OpenAI |
| Speech-to-text (input) | OpenAI Whisper |
| Text-to-speech (output) | ElevenLabs (preset or cloned voice) |
| Notifications | Pushover (optional) |
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

Open [localhost:3000](http://localhost:3000).

Detailed walk-through: [docs/SETUP.md](docs/SETUP.md).

## Going further

- 🔊 **Add voice**: [docs/VOICE.md](docs/VOICE.md) — ElevenLabs Starter ($5/mo) needed for cloud deploy; preset voices included, or clone your own.
- 🔔 **Get notified about visitors**: [docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md) — push notifications via Pushover; leads always logged locally.
- 🚀 **Deploy publicly**: [docs/DEPLOY.md](docs/DEPLOY.md) — Railway + Vercel as primary, also Render / Fly.io / HF Spaces.
- 🤝 **Contribute**: [CONTRIBUTING.md](CONTRIBUTING.md).

## How it works

```
   visitor (text or mic)
            │
            ├─ if mic: POST /transcribe ─▶ Whisper ─▶ text
            ▼
   POST /chat { message, history, voice }
            │
            ▼
   build_system_prompt(name) — reads every doc in me/
            │
            ▼
   ┌──── worker LLM (with tools) ──────┐
   │  Loops while finish_reason ==     │
   │  "tool_calls":                    │
   │   • record_user_details(email)    │
   │  Each call → leads.jsonl + Pushover│
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
acceptable                 rejected
return reply             retry worker with feedback
                         injected into system prompt
                 ▼
   if voice on → ElevenLabs TTS → audio_b64
                 ▼
   return { reply, audio_b64? }
                 ▼
   frontend renders text + plays audio
   (mic press during playback interrupts and starts new turn)
```

## Roadmap

- [x] **M1** — Text chat with persona loaded from any docs in `me/`
- [x] **M2** — Evaluator-Optimizer pattern (OpenAI judge + retry)
- [x] **M3** — Adaptive UI: landing screen with Call/Chat selector
- [x] **M4** — Voice output: ElevenLabs TTS with tuned VoiceSettings (preset or cloned)
- [x] **M5** — Voice input: push-to-talk with OpenAI Whisper transcription
- [x] **M6** — Interruptible playback: mic press during AI speech stops audio
- [x] **M7** — Lead capture tool: record visitor emails, with Pushover notifications
- [x] **M8** — Deploy configs (Railway + Render + HF Spaces + Fly.io + Dockerfile)
- [x] **M9** — OSS polish (CONTRIBUTING, docs, CI, favicon)
- [ ] **Future**: streaming TTS for lower latency
- [ ] **Future**: full real-time voice (WebRTC + ElevenAgents / OpenAI Realtime)
- [ ] **Future**: persistent leads storage (Supabase / Postgres) for production deploys

## License

MIT — see [LICENSE](LICENSE).
