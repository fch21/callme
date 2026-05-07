# Notifications & lead tracking

CallMe gives the AI one tool that fires automatically during conversations:

| Tool | When it fires | What it does |
|------|---------------|--------------|
| `record_user_details(email, name?, notes?)` | Visitor expresses clear interest in following up and provides an email | Logs the contact + sends a push notification (if Pushover is configured) |

The system prompt instructs the AI to use this tool only when there's clear visitor intent — it will not push for an email by default.

## What happens when the tool fires

1. **Always** — the event is appended to `me/leads.jsonl` (one JSON object per line).
2. **If Pushover is configured** — a push notification is sent to your phone.

`me/leads.jsonl` example:

```jsonl
{"ts": 1714928732.41, "kind": "user_details", "email": "ana@example.com", "name": "Ana", "notes": "Wants to discuss freelance work"}
```

This file is gitignored by default — your leads stay private.

## Setting up Pushover (optional, recommended)

Push notifications go to your phone, free for personal use.

1. Sign up at [pushover.net](https://pushover.net).
2. **Home screen** — copy your **User Key** (top right, starts with `u`).
3. Click **Create an Application/API Token** → name it "CallMe" → **Create**.
4. On the new application page, copy the **API Token** (starts with `a`).
5. Install the **Pushover** app on your phone, log in.
6. Add to your `.env`:

```env
PUSHOVER_USER=u...
PUSHOVER_TOKEN=a...
```

Restart the backend and try a chat. When the AI records a contact, you'll get a push.

## Without Pushover

If `PUSHOVER_USER` or `PUSHOVER_TOKEN` are missing, push is a silent no-op. **Leads are still logged to `me/leads.jsonl`** — you just have to check the file manually:

```bash
tail -f me/leads.jsonl
```

## Production caveat

`me/leads.jsonl` lives on the container's filesystem. On platforms with ephemeral storage (Render free tier, Fly.io without volumes), this file is **lost on every redeploy**. For real production traffic, swap to a persistent backend — Supabase, Postgres, S3, etc. The interface in `app/notify.py` is small enough to replace cleanly.
