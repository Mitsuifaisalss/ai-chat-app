#!/usr/bin/env bash
# AI Chat App + Ngrok Auto-Start
# Place this script and run as a LaunchAgent for auto-start on boot

APP_DIR="/Users/mitsuifaisalshahzad/Documents/SAK university/ai-chat-app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"

echo "$(date) | Starting AI Chat App + Ngrok tunnel..." >> "$APP_DIR/autostart.log"

# ─── Kill old processes ─────────────────────────────────────────────────────
pkill -f "uvicorn main:app" 2>/dev/null
pkill -f "ngrok http" 2>/dev/null
pkill -f "vite" 2>/dev/null
sleep 2

# ─── Start Backend ────────────────────────────────────────────────────────────
echo "$(date) | Starting backend..." >> "$APP_DIR/autostart.log"
cd "$BACKEND_DIR"
source .venv/bin/activate
nohup uvicorn main:app --host 0.0.0.0 --port 8000 >> "$APP_DIR/backend.log" 2>&1 &
sleep 3

if ! curl -s http://localhost:8000/api/health > /dev/null; then
    echo "$(date) | Backend failed to start!" >> "$APP_DIR/autostart.log"
    exit 1
fi

# ─── Start Frontend ──────────────────────────────────────────────────────────
echo "$(date) | Starting frontend..." >> "$APP_DIR/autostart.log"
cd "$FRONTEND_DIR"
nohup npx vite --host 0.0.0.0 --port 5173 >> "$APP_DIR/frontend.log" 2>&1 &
sleep 3

# ─── Start Ngrok Tunnel ────────────────────────────────────────────────────────
echo "$(date) | Starting ngrok tunnel..." >> "$APP_DIR/autostart.log"
cd "$APP_DIR"
nohup ngrok http http://localhost:5173 >> "$APP_DIR/ngrok.log" 2>&1 &
sleep 3

# ─── Report URL ───────────────────────────────────────────────────────────────
sleep 3
PUBLIC_URL=$(curl -s http://localhost:4040/api/tunnels | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['tunnels'][0]['public_url'] if d.get('tunnels') else 'UNKNOWN')")
echo "$(date) | Ngrok URL: $PUBLIC_URL" >> "$APP_DIR/autostart.log"

echo "$(date) | AI Chat App + Ngrok tunnel started successfully!" >> "$APP_DIR/autostart.log"
