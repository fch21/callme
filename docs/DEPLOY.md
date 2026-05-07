# Deploy guide

The recommended setup is **Railway** for the backend (Dockerfile-based, no sleep, ~$5/mo) and **Vercel** for the frontend (free, zero config). Alternatives are documented at the bottom.

## Before you deploy

You need to decide how your `me/` data ships to the backend container. Two options:

### Option 1 — Private fork (simplest)

Make your GitHub fork private, remove these lines from `.gitignore`:

```diff
- me/*.pdf
- me/*.txt
- me/*.md
- me/*.jpg
- me/*.jpeg
- me/*.png
- me/*.webp
```

Commit your `me/` files. The Dockerfile copies them into the image at build time.

### Option 2 — Public fork + secret files

Keep the fork public and `.gitignore` untouched. Use Railway's volume mount or environment-based file injection to upload `me/linkedin.pdf`, `me/summary.txt`, `me/photo.jpg` to `/app/me/` at runtime.

For most personal projects, **Option 1 + private fork** is the right call.

---

## 1. Backend on Railway

1. Push your fork to GitHub (private if you committed `me/` data).
2. Go to [railway.app](https://railway.app), sign in with GitHub.
3. **New Project → Deploy from GitHub repo** → select your fork.
4. Railway detects the Dockerfile. By default it looks for `Dockerfile` at the repo root — ours is at `backend/Dockerfile`. Set the **Dockerfile Path** to `backend/Dockerfile` in the service settings (Settings → Build → Dockerfile Path).
5. Add environment variables (Settings → Variables):

   | Variable | Value |
   |----------|-------|
   | `OPENAI_API_KEY` | (your key) |
   | `PERSONA_NAME` | (your name) |
   | `ALLOWED_ORIGINS` | (your Vercel URL — fill after step 2) |
   | `VOICE_MODE` | `preset` (if using voice) or `off` |
   | `ELEVENLABS_API_KEY` | (optional) |
   | `ELEVENLABS_VOICE_ID` | (optional) |
   | `PUSHOVER_USER` | (optional) |
   | `PUSHOVER_TOKEN` | (optional) |
   | `CHAT_MODEL` | `gpt-5.4-mini` (or override) |
   | `EVALUATOR_MODEL` | `gpt-5.4-mini` (or override) |

6. Trigger a deploy. Railway gives you a URL like `https://callme-backend-production.up.railway.app`. Note it.
7. Sanity check: `curl https://your-backend.up.railway.app/health`.

> Railway hobby plan ($5/mo) gives you ~500 hours of compute, which is more than enough for a low-traffic personal site. No sleep, fast cold starts.

## 2. Frontend on Vercel

1. [vercel.com](https://vercel.com) → **Add New** → **Project** → import your fork.
2. **Root Directory**: set to `frontend`. Vercel auto-detects Next.js.
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = your Railway backend URL (from step 1.6)

   (Persona name comes from the backend's `/health` endpoint — no frontend env var for it.)
4. Deploy. Vercel gives you a URL like `https://callme-yourname.vercel.app`.

## 3. Wire CORS

Go back to Railway → your service → **Variables** → set `ALLOWED_ORIGINS` to your Vercel URL (e.g. `https://callme-yourname.vercel.app`). Save → Railway redeploys.

## 4. Custom domain (optional)

Both Vercel and Railway support custom domains.
- **Vercel**: project → **Settings** → **Domains**.
- **Railway**: service → **Settings** → **Networking** → **Custom Domain**.

After pointing your DNS, remember to update `ALLOWED_ORIGINS` to include the new domain (comma-separated if you want both).

---

## Alternatives

### Render + Vercel (free tier, sleeps after 15 min)

`render.yaml` is included in the repo. Steps:

1. [render.com](https://render.com) → **New** → **Blueprint** → connect your fork.
2. Render detects `render.yaml` and proposes the service.
3. Apply. Render asks for the secret env vars defined in `render.yaml`.
4. Frontend on Vercel exactly like step 2 above.

Free tier sleeps after 15 min of inactivity (~30s cold start on first request).

### HuggingFace Spaces + Vercel (free, course-friendly)

For a deploy that aligns with the OpenAI Agents course context. Steps:

1. Sign up at [huggingface.co](https://huggingface.co), create an Access Token (write).
2. Create a new Space, type **Docker**.
3. Add a `README.md` at repo root with HF metadata frontmatter:
   ```yaml
   ---
   title: CallMe Backend
   emoji: 📞
   colorFrom: blue
   colorTo: indigo
   sdk: docker
   app_port: 8000
   ---
   ```
4. Push your repo to the Space's git remote: `git push hf main`.
5. Add secrets in the Space's Settings → Variables and Secrets.
6. Frontend on Vercel exactly like the Railway flow, pointing `NEXT_PUBLIC_API_URL` to your Space URL (e.g. `https://yourname-callme.hf.space`).

HF free tier sleeps after 48 hours of inactivity.

### Fly.io + Vercel (more control, free–$5/mo)

For finer control over regions, scaling, persistent volumes:

```bash
brew install flyctl    # or curl -L https://fly.io/install.sh | sh
fly auth login
fly launch --dockerfile backend/Dockerfile --copy-config=false
# Edit fly.toml as needed, then:
fly deploy
```

Fly.io has a generous free allowance for small apps; production-grade is ~$5/mo for always-on.

### Self-hosted Docker

If you have a VPS or homelab:

```bash
docker build -f backend/Dockerfile -t callme-backend .
docker run --env-file .env -p 8000:8000 callme-backend
```

Reverse-proxy (nginx, Caddy, Cloudflare Tunnel) to expose it publicly.
