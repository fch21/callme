# Setup guide

This walks you through running CallMe locally with your own persona.

## Prerequisites

- **Python 3.11+** (we use [uv](https://docs.astral.sh/uv/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Node.js 20+** with npm
- **OpenAI API key** ([platform.openai.com](https://platform.openai.com/api-keys))

Optional (for voice mode):
- **ElevenLabs API key + voice ID** — see [docs/VOICE.md](VOICE.md)

## 1. Clone and configure

```bash
git clone https://github.com/<your-username>/callme.git
cd callme
cp .env.example .env
```

Open `.env` and fill in at minimum:

```env
OPENAI_API_KEY=sk-...
PERSONA_NAME=Your Name
```

## 2. Drop in your data

Put your documents in `me/`. The persona loads **any** `.pdf`, `.txt`, or `.md` file dropped here.

**Common starting set:**

| File | Required? | Notes |
|------|-----------|-------|
| `linkedin.pdf` | Recommended | Profile → More → Save to PDF |
| `summary.txt` | Recommended | A few paragraphs in first person about you |
| `photo.jpg` | No | Shown as caller image; also accepts `.png`, `.jpeg`, `.webp` |

**Add as many as you want**: `resume.pdf`, `projects.md`, `talks.md`, `recommendations.txt`, `philosophy.md`, etc. Filename becomes the section title in the prompt — name them in a way that gives the AI context.

These files are **gitignored by default** so they stay out of forks. See `me/README.md` for the full list of conventions.

## 3. Run the backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Sanity check:

```bash
curl http://localhost:8000/health
# {"status":"ok","persona":"Your Name","voice_enabled":false}
```

## 4. Run the frontend

In a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000`, click **Call**, type a message.

## Troubleshooting

**Backend won't start with `OPENAI_API_KEY` error**
The first chat call (not import) will fail if the key is missing. Make sure `.env` is at the project root (not inside `backend/`).

**Frontend can't reach backend**
Check `NEXT_PUBLIC_API_URL` if you've changed the backend port. Default expects `http://localhost:8000`.

**Persona answers don't sound like you**
The system prompt is built from `me/summary.txt` + `me/linkedin.pdf`. Make `summary.txt` more specific — quirks, opinions, recent work — and make sure `linkedin.pdf` extracts text cleanly (some PDFs are images; export from LinkedIn directly, not from a scanner).

**The evaluator keeps rejecting answers**
Tweak `app/evaluator.py` — the rejection criteria are conservative. You can also raise the bar by setting `EVALUATOR_MODEL=gpt-4o` for stronger judgment.

## What's next

- Set up voice: [docs/VOICE.md](VOICE.md)
- Deploy publicly: [docs/DEPLOY.md](DEPLOY.md)
