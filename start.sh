#!/usr/bin/env bash
# start.sh - Launch the backend (FastAPI) and the frontend (Vite) together.

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

BLUE='\033[1;34m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; RED='\033[1;31m'; NC='\033[0m'
log()  { printf "${BLUE}==>${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*"; }

# Verify setup has been done.
if [ ! -d "$BACKEND_DIR/.venv" ]; then
  err "backend/.venv missing. Run ./setup.sh first."
  exit 1
fi
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  err "frontend/node_modules missing. Run ./setup.sh first."
  exit 1
fi

# Ensure Ollama is running.
if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
  warn "Ollama not running — starting it in the background…"
  if command -v ollama >/dev/null 2>&1; then
    nohup ollama serve >/tmp/ollama.log 2>&1 &
    sleep 2
  else
    err "Ollama is not installed. Run ./setup.sh first."
    exit 1
  fi
fi

# Track child PIDs so we can clean up on exit.
PIDS=()
cleanup() {
  echo
  log "Shutting down…"
  for pid in "${PIDS[@]}"; do
    if kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
  done
  wait 2>/dev/null || true
  ok "Bye"
}
trap cleanup EXIT INT TERM

# Backend
log "Starting backend on http://localhost:8000"
(
  cd "$BACKEND_DIR"
  # shellcheck disable=SC1091
  . .venv/bin/activate
  exec python -m uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile certs/key.pem --ssl-certfile certs/cert.pem
) &
PIDS+=("$!")

# Frontend
log "Starting frontend on http://localhost:5173"
(
  cd "$FRONTEND_DIR"
  exec npm run dev
) &
PIDS+=("$!")

echo
ok "Both servers starting. Open ${GREEN}http://localhost:5173${NC} in your browser."
echo "Press Ctrl+C to stop."

wait
