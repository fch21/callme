# Contributing to CallMe

Thanks for your interest! CallMe is intentionally small and focused: an AI persona you can fork in a few minutes. Contributions that make forking easier or the experience more polished are very welcome.

## Ground rules

- **Keep it forkable.** Anything you add should work for someone who isn't you. Avoid baking in personal data, hardcoded URLs, or assumptions about the maintainer's setup.
- **Keep it small.** This is not a framework. If a feature requires a new dependency, justify it in the PR description.
- **Keep `me/` private by default.** Personal data files (`linkedin.pdf`, `summary.txt`, `photo.*`, `voice_id.txt`) are gitignored. Don't commit them.

## Local setup

See [docs/SETUP.md](docs/SETUP.md) for the full guide. Short version:

```bash
cp .env.example .env       # fill in OPENAI_API_KEY
cd backend && uv sync && uv run uvicorn app.main:app --reload
cd frontend && npm install && npm run dev
```

## Running checks

```bash
# Backend
cd backend
uv run pytest

# Frontend
cd frontend
npx tsc --noEmit
npm run build
```

CI runs both on every PR.

## Pull requests

- One concern per PR.
- Update `README.md` and `docs/` if behavior or setup changes.
- If you add an env var, document it in `.env.example` and `docs/SETUP.md`.

## Project structure

```
callme/
├── backend/          # FastAPI service (Python 3.11+)
│   ├── app/
│   │   ├── main.py        # API routes
│   │   ├── chat.py        # worker LLM + retry loop
│   │   ├── evaluator.py   # judge LLM
│   │   ├── persona.py     # builds system prompt from me/
│   │   ├── voice.py       # ElevenLabs TTS
│   │   └── config.py      # env vars
│   └── tests/
├── frontend/         # Next.js 15 + Tailwind
│   └── app/
│       ├── page.tsx       # call screen
│       └── layout.tsx
├── me/               # YOUR data (gitignored, except README + example)
├── docs/             # setup, deploy, voice guides
└── .github/          # CI workflow
```

## Code style

- Python: standard library + small dependencies. No type-checker required to pass CI yet.
- TypeScript: strict mode is on. Keep components in `app/` until there's a real reason to split.
- Comments: only when *why* is non-obvious. Don't narrate *what* the code does.
