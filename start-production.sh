#!/usr/bin/env bash
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

# ─── Kill old processes ─────────────────────────────────────────────────────
tail -n +2 /dev/null || true
pkill -f "uvicorn main:app" 2>/dev/null || true
pkill -f "cloudflared tunnel" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true
sleep 1

# ─── Start Backend ────────────────────────────────────────────────────────────
echo "==> Starting Backend..."
cd "$BACKEND_DIR"
source .venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 > "$APP_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
sleep 2

# Verify backend is up
if ! curl -s http://localhost:8000/api/health > /dev/null; then
    echo "✗ Backend failed to start. Check backend.log"
    exit 1
fi
echo "✓ Backend running at http://localhost:8000"

# ─── Start Frontend ──────────────────────────────────────────────────────────
echo "==> Starting Frontend..."
cd "$FRONTEND_DIR"
nohup npx vite --host 0.0.0.0 --port 5173 > "$APP_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
sleep 2
echo "✓ Frontend running at http://localhost:5173"

echo ""
echo "========================================"
echo "   AI Chat App is running locally!"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "========================================"
echo ""
echo "Run this in ANOTHER terminal to make it public:"
echo ""
echo "   cloudflared tunnel --url http://localhost:5173"
echo ""
echo "Then share the https://xxxx.trycloudflare.com link!"
echo ""

wait
