# CallMe — Frontend

Next.js 15 (App Router) + TypeScript + Tailwind. Three view states share a single page:

- **Landing** — photo + name + Call/Chat selector (or just Chat if voice isn't configured)
- **CallView** — voice-first call experience: photo with state-driven glow, status text, mic button, transcript, fallback text input
- **ChatView** — text-first chat: small header (photo + name + back arrow), transcript, message input

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

The persona name and voice availability come from the backend's `/health` endpoint, not from a frontend env var.

## Routing logic

On mount the page hits `GET /health`:

- `voice_enabled=true` → Landing offers both **Call** and **Chat** buttons.
- `voice_enabled=false` → Landing shows only the **Chat** button.

After picking, the visitor is in CallView or ChatView. Tapping the close X (Call) or back arrow (Chat) returns to Landing.

## Voice in & out

Voice OUT (`useChat`):
- When the backend returns `audio_b64`, an `<audio>` element plays the base64 mp3 inline.
- During playback the photo gets an emerald glow + 3 expanding rings.
- Sending a new message (text or voice) interrupts current playback.

Voice IN (`useRecorder`):
- Press the mic button → `MediaRecorder` captures audio → blob is POST'd to `/transcribe` → Whisper returns text → text is auto-sent as a chat message.
- Mic button doubles as **interrupt**: tapping it while the AI is speaking stops the audio (the icon switches from mic to pause).
- Mic permission is requested on first tap; denial shows a fallback message and the text input still works.

## States and visual cues

| State | Status text | Photo style | Mic button |
|-------|-------------|-------------|------------|
| Idle | `On call` | neutral ring | white, mic icon — "Tap to talk" |
| Listening | `Listening…` | neutral ring | red, mic icon, ping pulse — "Tap to send" |
| Transcribing | `Transcribing…` | neutral ring | disabled |
| Thinking | `Thinking…` | breathing emerald glow | disabled |
| Speaking | `Speaking…` | strong emerald glow + 3 expanding rings | grey, pause icon — "Tap to interrupt" |

## Layout

```
app/
├── layout.tsx     # html shell
├── page.tsx       # Home + useChat + useRecorder + Landing/Call/Chat views
├── globals.css    # Tailwind entry
└── icon.svg       # site favicon
```
