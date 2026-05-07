# CallMe — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind. Two-state phone-call UI:

- **Idle**: photo + Call button
- **In-call**: header with photo + "On call / Speaking…" status, transcript, message input, End button

## Run

```bash
npm install
npm run dev
```

Default port: 3000.

## Environment

Set in `.env.local` or via your hosting provider:

| Var | Default | Notes |
|-----|---------|-------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | Backend URL |

The persona name and voice-mode availability come from the backend's `/health` endpoint, not from a frontend env var.

## View modes

The frontend chooses between two layouts based on `health.voice_enabled`:

- **CallView** — when voice is enabled. Phone-call metaphor: idle screen with photo + "Call" button → in-call screen with transcript + "Speaking…" indicator.
- **ChatView** — when voice is disabled. Standard chat: header with photo + "Online", transcript, message input. No Call button.

## Voice playback

When `voice_enabled=true`, each `/chat` response includes `audio_b64` (base64 mp3). The frontend plays it inline and pulses the photo while speaking.

## Layout

```
app/
├── layout.tsx     # html shell
├── page.tsx       # the call screen (single-file UI for now)
└── globals.css    # Tailwind entry
```
