# Voice setup

CallMe handles two directions of voice:

- **Voice IN**: visitor speaks → mic records → Whisper transcribes → message is sent. **Always on**, uses your `OPENAI_API_KEY`.
- **Voice OUT**: AI reply → ElevenLabs TTS → audio plays inline. **Optional**, requires ElevenLabs.

This doc covers voice OUT (TTS). Voice IN works automatically when `OPENAI_API_KEY` is set.

## ⚠️ Important: ElevenLabs free tier doesn't work on cloud servers

ElevenLabs detects requests coming from data center IPs (Railway, Render, Fly.io, etc.) and treats them as VPN/proxy abuse. **Free tier is blocked from server use** and will return 401 with a "detected_unusual_activity" message.

You need a paid plan (Starter, $5/mo) to use ElevenLabs from a deployed backend. Locally on your machine the free tier works fine.

## 1. Get an API key

1. Sign up at [elevenlabs.io](https://elevenlabs.io).
2. Subscribe to **Starter** (or higher) if you plan to deploy.
3. Profile menu → **API Keys** → **Create API Key**. Copy it.

## 2. Pick or clone a voice

### Option A — Preset voice

1. Go to **Voice Library**.
2. Browse, sample voices, click **Add to my Voices** on one you like.
3. Open it from **My Voices** → copy the **Voice ID** (the small clipboard icon next to the name).

### Option B — Cloned voice

1. **Voice Lab** → **Add Voice** → **Instant Voice Cloning** (Starter plan covers this).
2. Upload ~1 minute of clean audio of you speaking (no music, no other voices, normal pace).
3. Name it, save, copy the **Voice ID**.

For higher quality, use **Professional Voice Cloning** (Creator plan, $22/mo, ~30 min of audio) — same code path, just a different voice ID.

## 3. Configure `.env`

```env
VOICE_MODE=preset           # or 'cloned' — both behave the same in code
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM   # whatever ID you copied
```

Set `VOICE_MODE=off` to disable voice output entirely (the visitor still has voice IN via the mic, but the AI will reply with text only).

## 4. Verify

Restart the backend and hit `/health`:

```bash
curl http://localhost:8000/health
# {"status":"ok","persona":"...","voice_enabled":true}
```

If `voice_enabled` is `false`, check `.env`: `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` must be set, and `VOICE_MODE` must not be `off`.

If you see 401 errors in your server logs, see the warning at the top about free-tier server blocks.

## Voice settings (tone & pace)

The defaults in `backend/app/voice.py` are tuned for a conversational feel rather than ElevenLabs' more "narrator-like" defaults:

```python
VoiceSettings(
    stability=0.4,         # lower = more emotion / variation per turn
    similarity_boost=0.5,  # how strictly to mimic the source voice
    style=0.25,            # exaggerate the voice's own characteristics
    speed=1.1,             # slightly faster than natural
    use_speaker_boost=True,
)
```

Tweak these in `voice.py` to taste:

- More monotone / consistent → raise `stability` (0.6–0.8)
- More expressive / emotional → lower `stability` (0.3) and raise `style` (0.3)
- Tighter to source voice → raise `similarity_boost` (0.75–0.9)
- Slower, more deliberate → drop `speed` (0.9–1.0)

ElevenLabs caps `speed` at 1.2.

## Cost

- **Whisper (input)**: ~$0.006/minute. A 10-second message costs ~$0.001.
- **ElevenLabs Starter ($5/mo)**: 30k characters/month TTS. A typical 200-char reply is 0.7% of monthly quota.
- **ElevenLabs Creator ($22/mo)**: 100k characters/month + Professional Voice Cloning + 192kbps audio.

For a personal site with low traffic, Starter is more than enough.

## Quality / latency tips

- Shorter replies = faster TTS. The persona prompt encourages concise, conversational answers.
- If latency feels slow, switch to a smaller mp3 format (`mp3_22050_32`) by editing `backend/app/voice.py`.
- For real low-latency, use the streaming endpoint (`text_to_speech.stream`) — not implemented yet, contributions welcome.
- Even lower latency: the Conversational AI agent track ([ElevenAgents](https://help.elevenlabs.io/hc/en-us/articles/29298065878929-How-much-does-ElevenAgents-cost)) does end-to-end real-time voice with interruption — billed per minute, separate from the TTS character quota.
