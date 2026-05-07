FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /usr/local/bin/

WORKDIR /app

COPY backend/pyproject.toml backend/uv.lock* /app/backend/
RUN cd /app/backend && uv sync --frozen --no-dev --no-install-project

COPY backend/app /app/backend/app
RUN cd /app/backend && uv sync --frozen --no-dev

COPY me /app/me

WORKDIR /app/backend
EXPOSE 8000
CMD uv run uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
