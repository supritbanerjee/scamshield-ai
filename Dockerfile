# syntax=docker/dockerfile:1

# Stage 1: compile the React/Vite frontend.
FROM node:20-slim AS frontend-builder
WORKDIR /build/frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# An empty API URL makes the browser call /api on the same Space domain.
ENV VITE_API_URL=""
RUN npm run build

# Stage 2: run Flask, the NLP model, and the compiled frontend.
FROM python:3.13-slim AS runtime

# scikit-learn/scipy need the OpenMP runtime on slim Linux images.
RUN apt-get update \
    && apt-get install -y --no-install-recommends libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Hugging Face Docker Spaces run applications as UID 1000.
RUN useradd -m -u 1000 user
USER user

ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=7860 \
    FLASK_DEBUG=0

WORKDIR $HOME/app

COPY --chown=user requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --user -r requirements.txt

COPY --chown=user backend/ ./backend/
COPY --from=frontend-builder --chown=user /build/frontend/dist ./frontend/dist/

EXPOSE 7860

# One worker keeps the lightweight in-memory model and SQLite history consistent.
CMD ["gunicorn", "--chdir", "backend", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "4", "--timeout", "120", "app:app"]
