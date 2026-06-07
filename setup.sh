#!/usr/bin/env bash
# setup.sh - One-command environment setup for Gemma AI Chat
# - Verifies / installs Ollama (macOS)
# - Pulls the configured model
# - Installs backend (Python venv) and frontend (npm) dependencies

set -e

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

# Colours
BLUE='\033[1;34m'; GREEN='\033[1;32m'; YELLOW='\033[1;33m'; RED='\033[1;31m'; NC='\033[0m'
log()  { printf "${BLUE}==>${NC} %s\n" "$*"; }
ok()   { printf "${GREEN}✓${NC} %s\n" "$*"; }
warn() { printf "${YELLOW}!${NC} %s\n" "$*"; }
err()  { printf "${RED}✗${NC} %s\n" "$*"; }

# ---------------------------------------------------------------------------
# 1. Load .env (or copy example) so OLLAMA_MODEL is known.
# ---------------------------------------------------------------------------
if [ ! -f "$BACKEND_DIR/.env" ]; then
  if [ -f "$BACKEND_DIR/.env.example" ]; then
    cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
    ok "Created backend/.env from .env.example"
  fi
fi

OLLAMA_MODEL="gemma3"
if [ -f "$BACKEND_DIR/.env" ]; then
  # shellcheck disable=SC1091
  set -a; . "$BACKEND_DIR/.env"; set +a
fi
OLLAMA_MODEL="${OLLAMA_MODEL:-gemma3}"

# ---------------------------------------------------------------------------
# 2. Ollama
# ---------------------------------------------------------------------------
log "Checking Ollama installation"
if ! command -v ollama >/dev/null 2>&1; then
  warn "Ollama is not installed."
  case "$(uname -s)" in
    Darwin)
      cat <<'EOM'

To install Ollama on macOS, choose one of:

  1. Download the desktop app:
       https://ollama.com/download/mac

  2. Or via Homebrew:
       brew install ollama

After installing, run this script again.
EOM
      exit 1
      ;;
    Linux)
      cat <<'EOM'

To install Ollama on Linux:
  curl -fsSL https://ollama.com/install.sh | sh

Then re-run this script.
EOM
      exit 1
      ;;
    *)
      err "Unsupported OS. Install Ollama manually from https://ollama.com"
      exit 1
      ;;
  esac
else
  ok "Ollama is installed: $(ollama --version 2>/dev/null || echo present)"
fi

# Make sure the Ollama service is reachable.
log "Checking Ollama server (http://localhost:11434)"
if ! curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
  warn "Ollama server is not running. Starting it in the background…"
  if command -v ollama >/dev/null 2>&1; then
    nohup ollama serve >/tmp/ollama.log 2>&1 &
    sleep 2
  fi
fi

if curl -fsS http://localhost:11434/api/tags >/dev/null 2>&1; then
  ok "Ollama server is reachable"
else
  err "Could not reach Ollama at http://localhost:11434. Start it with: ollama serve"
  exit 1
fi

# Pull the model.
log "Pulling model: $OLLAMA_MODEL (this may take a while the first time)"
if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$OLLAMA_MODEL"; then
  ok "Model '$OLLAMA_MODEL' already present"
else
  ollama pull "$OLLAMA_MODEL"
  ok "Model '$OLLAMA_MODEL' pulled"
fi

# Quick smoke test.
log "Verifying model responds"
if curl -fsS -X POST http://localhost:11434/api/generate \
    -H 'Content-Type: application/json' \
    -d "{\"model\":\"$OLLAMA_MODEL\",\"prompt\":\"hi\",\"stream\":false}" \
    >/dev/null 2>&1; then
  ok "Model is responding"
else
  warn "Model did not respond on first try (this can be normal during warm-up)."
fi

# ---------------------------------------------------------------------------
# 3. Backend (Python)
# ---------------------------------------------------------------------------
log "Setting up Python backend"
if ! command -v python3 >/dev/null 2>&1; then
  err "python3 not found. Install Python 3.10+ first."
  exit 1
fi

cd "$BACKEND_DIR"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
  ok "Created backend/.venv"
fi
# shellcheck disable=SC1091
. .venv/bin/activate
python -m pip install --upgrade pip >/dev/null
pip install -r requirements.txt
deactivate
ok "Backend dependencies installed"

# ---------------------------------------------------------------------------
# 4. Frontend (Node)
# ---------------------------------------------------------------------------
log "Setting up frontend"
if ! command -v node >/dev/null 2>&1; then
  err "Node.js not found. Install Node 18+ (https://nodejs.org)."
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  err "npm not found."
  exit 1
fi

cd "$FRONTEND_DIR"
npm install
ok "Frontend dependencies installed"

cd "$ROOT_DIR"
echo
ok "Setup complete!"
echo "Run ${GREEN}./start.sh${NC} to launch backend + frontend."
