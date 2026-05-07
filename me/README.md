# Your data goes here

Drop any `.pdf`, `.txt`, or `.md` file in this folder and the AI will use it as context. The filename becomes the section title in the system prompt — so name files in a way that gives the AI useful context.

## Common files

| File | What it is |
|------|------------|
| `linkedin.pdf` | Export your LinkedIn profile as PDF (Profile → More → Save to PDF) |
| `summary.txt` | A short bio in your own words — first person, a few paragraphs |
| `photo.jpg` | A portrait photo — shown as the "caller" image (also supports `.png`, `.jpeg`, `.webp`) |

## Add as many as you want

The AI loads everything in this folder. Useful additions:

| File | Purpose |
|------|---------|
| `resume.pdf` / `cv.pdf` | Full résumé / CV |
| `projects.md` | Notable projects, with descriptions |
| `talks.md` / `talks.txt` | Conferences, talks, podcasts |
| `recommendations.txt` | Testimonials from colleagues |
| `writings.md` | Notable articles, blog posts, papers |
| `philosophy.md` | How you think about your work — opinions, principles |

The richer the context, the more your AI persona will sound like you instead of a generic representation. Make `summary.txt` (or any of the above) opinionated and specific.

## Excluded from loading

These files in `me/` are **not** sent to the AI:

- `README.md` (this file — instructions for you)
- `*.example.*` (templates)
- `leads.jsonl` (visitor captures, runtime-generated)
- Photos (`.jpg`, `.png`, `.webp`)

Everything else is fair game.

## Privacy

All `.pdf`, `.txt`, `.md`, and image files in this folder are **gitignored by default** (see `.gitignore` at the project root). Your data stays out of forks. If you want to commit your data (e.g., to deploy via a private GitHub fork → Railway), edit `.gitignore` to remove the relevant lines.
