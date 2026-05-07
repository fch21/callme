# Voice setup

CallMe supports two voice modes via [ElevenLabs](https://elevenlabs.io):

- **`preset`** — pick a ready-made voice from their library (free tier works).
- **`cloned`** — clone your own voice from an audio sample (paid plan).

Either way, the code is identical — what changes is the `voice_id` you put in `.env`.

## 1. Get an API key

1. Sign up at [elevenlabs.io](https://elevenlabs.io).
2. Profile menu → **API Keys** → **Create API Key**. Copy it.

## 2. Pick or clone a voice

### Option A — Preset (free)

1. Go to **Voice Library**.
2. Browse, sample voices, click **Add to my Voices** on one you like.
3. Open it from **My Voices** → copy the **Voice ID** (the small clipboard icon next to the name).

### Option B — Cloned (Starter plan, $5/mo)

1. Plan: **Starter** or higher.
2. Go to **Voice Lab** → **Add Voice** → **Instant Voice Cloning**.
3. Upload ~1 minute of clean audio of you speaking (no music, no other voices, normal pace).
4. Name it, save. Copy the **Voice ID**.

For higher quality, use **Professional Voice Cloning** (Creator plan, $22/mo, ~30 min of audio) — same code, just a different voice ID.

## 3. Configure `.env`

```env
VOICE_MODE=preset           # or 'cloned' — both behave the same in code
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # whatever ID you copied
```

Set `VOICE_MODE=off` to disable voice entirely (text-only chat).

## 4. Verify

Restart the backend and hit `/health`:

```bash
curl http://localhost:8000/health
# {"status":"ok","persona":"...","voice_enabled":true}
```

If `voice_enabled` is `false`, check your `.env` — both `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` must be set, and `VOICE_MODE` must not be `off`.

## Cost

Default model is `eleven_multilingual_v2` at `mp3_44100_128` quality. Free tier gives ~10k chars/month. A 200-word reply is ~1k chars, so the free tier is fine for low-traffic personal use. The Starter plan includes 30k chars/month.

## Quality / latency tips

- Shorter replies = faster TTS. The persona prompt encourages concise, conversational answers.
- If latency feels slow, switch to a smaller mp3 format (`mp3_22050_32`) by editing `backend/app/voice.py`.
- For real low-latency, use the streaming endpoint (`text_to_speech.stream`) — not implemented yet, contributions welcome.
