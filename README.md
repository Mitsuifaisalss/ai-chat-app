# Gemma AI Chat

A web-based AI chat app powered by a **local LLM** (Gemma 3 via [Ollama](https://ollama.com)) with **on-demand web search** for accurate, up-to-date answers.

- 🧠 **Local LLM** — your conversations stay on your machine
- 🌐 **Web search + scraping** — DuckDuckGo + httpx + BeautifulSoup
- ⚡ **Streaming responses** — token-by-token over WebSocket
- 🔗 **Source citations** — clickable links under every web-grounded answer
- 🌓 **Dark mode by default** with a light-mode toggle
- 📱 **Responsive** — works on mobile

---

## Stack

| Layer | Tech |
|---|---|
| LLM | Ollama running `gemma3` (configurable) |
| Backend | Python + FastAPI + WebSockets + httpx + BeautifulSoup + duckduckgo-search |
| Frontend | React + Vite + TypeScript + Tailwind CSS |

---

## Quick start

Requirements: **Python 3.10+**, **Node 18+**, and macOS or Linux. (Windows works via WSL.)

```bash
# 1. One-command setup: installs deps + pulls the model
./setup.sh

# 2. Launch backend + frontend
./start.sh
```

Then open **http://localhost:5173**.

`setup.sh` will:
1. Verify Ollama is installed (and print install instructions if not).
2. Make sure the Ollama server is running.
3. Pull the configured model (`gemma3` by default).
4. Create a Python virtualenv at `backend/.venv` and install requirements.
5. `npm install` the frontend.

---

## Configuration

Copy and edit the example env file:

```bash
cp backend/.env.example backend/.env
```

Key settings (`backend/.env`):

| Variable | Default | Notes |
|---|---|---|
| `OLLAMA_HOST` | `http://localhost:11434` | Ollama server URL |
| `OLLAMA_MODEL` | `gemma3` | Any model you have pulled (e.g. `llama3`, `qwen2.5`, `mistral`) |
| `HOST` / `PORT` | `0.0.0.0` / `8000` | Backend bind address |
| `SEARCH_MAX_RESULTS` | `5` | DuckDuckGo result count |
| `SCRAPE_MAX_CHARS` | `2500` | Per-page text cap fed to the LLM |
| `SCRAPE_TIMEOUT` | `8` | Per-page fetch timeout (s) |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Allowed origins |

To swap models, pull one and update `OLLAMA_MODEL`:

```bash
ollama pull llama3
# then edit backend/.env: OLLAMA_MODEL=llama3
```

---

## Project structure

```
ai-chat-app/
├── backend/
│   ├── main.py              # FastAPI app + WebSocket /ws/chat
│   ├── llm.py               # Async Ollama client (streaming)
│   ├── search.py            # DuckDuckGo search + BeautifulSoup scraping
│   ├── router.py            # Heuristic: does this need a web search?
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── types.ts
│   │   ├── components/
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── SearchIndicator.tsx
│   │   │   ├── SourceCitations.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── InputArea.tsx
│   │   ├── hooks/
│   │   │   └── useChat.ts   # WS lifecycle + chat state + localStorage
│   │   └── styles/
│   │       └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── tsconfig*.json
├── setup.sh
├── start.sh
└── README.md
```

---

## How it works

1. The frontend opens a WebSocket to `ws://localhost:8000/ws/chat` and sends the chat history.
2. The backend's **router** inspects the latest user message:
   - Time-sensitive / news / factual-lookup phrasing → trigger web search.
   - Otherwise → answer from the model's own knowledge.
3. If searching, the backend uses **DuckDuckGo** to find URLs, then concurrently fetches and extracts readable text with **httpx + BeautifulSoup** (`<article>` / `<main>` preferred, scripts/styles stripped).
4. The scraped context is injected as a second system message and the model is told to cite sources as `[1]`, `[2]`.
5. Tokens stream from Ollama's `/api/chat` straight through the WebSocket to the browser.
6. Sources are rendered as chip-style citations under the assistant message.

### WebSocket protocol

Client → server:
```json
{ "messages": [{ "role": "user", "content": "..." }] }
```

Server → client (multiple frames):
```json
{ "type": "status",  "stage": "thinking" | "searching" | "scraping" | "generating" }
{ "type": "sources", "sources": [{ "title": "...", "url": "...", "snippet": "..." }] }
{ "type": "token",   "content": "..." }
{ "type": "done" }
{ "type": "error",   "message": "..." }
```

---

## Development

Run backend and frontend separately:

```bash
# Backend
cd backend
source .venv/bin/activate
uvicorn main:app --reload

# Frontend (in another terminal)
cd frontend
npm run dev
```

Type-check the frontend:

```bash
cd frontend && npm run typecheck
```

---

## Troubleshooting

**"Connection error. Is the backend running on :8000?"**
- Run `./start.sh`, or check that `uvicorn` is up.

**Ollama not running**
- Start it manually: `ollama serve`.

**Model is slow on first call**
- First inference loads weights into memory; subsequent calls are much faster.

**Web search returns nothing**
- DuckDuckGo occasionally rate-limits. Try again in a minute, or lower `SEARCH_MAX_RESULTS`.

**Want a different model?**
- `ollama pull <model>` and set `OLLAMA_MODEL=<model>` in `backend/.env`.

---

## License

MIT
