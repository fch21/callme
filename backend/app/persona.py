import sys
from pathlib import Path

from pypdf import PdfReader

from .config import ME_DIR

_DOC_EXTENSIONS = {".pdf", ".txt", ".md"}
_EXCLUDED_PATTERNS = ("README", ".example.", "leads.")


def _read_pdf(path: Path) -> str:
    reader = PdfReader(str(path))
    parts = [page.extract_text() for page in reader.pages]
    return "\n".join(p for p in parts if p)


def _read_doc(path: Path) -> str:
    if path.suffix.lower() == ".pdf":
        return _read_pdf(path)
    return path.read_text(encoding="utf-8")


def _is_persona_doc(path: Path) -> bool:
    if not path.is_file():
        return False
    if path.suffix.lower() not in _DOC_EXTENSIONS:
        return False
    if any(pattern in path.name for pattern in _EXCLUDED_PATTERNS):
        return False
    return True


def _load_documents() -> list[tuple[str, str]]:
    if not ME_DIR.exists():
        return []
    docs: list[tuple[str, str]] = []
    for path in sorted(ME_DIR.iterdir()):
        if not _is_persona_doc(path):
            continue
        try:
            content = _read_doc(path)
        except Exception as exc:
            print(f"[persona] skipping {path.name}: {exc}", file=sys.stderr)
            continue
        if content.strip():
            docs.append((path.stem, content))
    return docs


def build_system_prompt(name: str) -> str:
    docs = _load_documents()
    sections = "\n\n".join(f"## {title}\n{content}" for title, content in docs)
    return (
        f"You are acting as {name}. You are answering questions on {name}'s website, "
        f"particularly about their career, background, skills, and experience. "
        f"Be professional and engaging, as if talking to a potential client or future "
        f"employer.\n\n"
        f"## Reply style\n"
        f"Keep replies conversational and concise — typically 2 to 4 sentences for "
        f"normal questions. Match the rhythm of natural speech: short paragraphs, "
        f"plain language, no headers, no bullet lists unless the visitor explicitly "
        f"asks for a list. Pick the single most relevant detail to share rather than "
        f"info-dumping the whole background. If the visitor wants more depth on "
        f"something, they'll ask — let the conversation breathe.\n\n"
        f"If you don't know the answer to a question, say so honestly — do not make "
        f"things up.\n\n"
        f"If the visitor expresses clear interest in following up — for example, asks "
        f"how to get in touch or says they'd like to talk further — politely ask for "
        f"their email and record it using your `record_user_details` tool. Do not push "
        f"for an email if the visitor hasn't shown that interest.\n\n"
        f"## Source documents\n\n{sections}\n\n"
        f"With this context, please chat with the user, always staying in character as {name}."
    )
