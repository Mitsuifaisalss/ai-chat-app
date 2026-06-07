"""FastAPI app: REST endpoints + WebSocket streaming chat.

The WebSocket protocol used by the frontend:

  client -> server (JSON):
    { "messages": [{"role": "user|assistant", "content": "..."}], "model": "optional" }

  server -> client (JSON, multiple frames):
    { "type": "status",   "stage": "thinking" | "searching" | "scraping" | "generating" }
    { "type": "sources",  "sources": [{"title","url","snippet"}, ...] }
    { "type": "token",    "content": "..." }
    { "type": "done" }
    { "type": "error",    "message": "..." }
"""

from __future__ import annotations

import datetime
import json
import os
from typing import List, Dict, Any

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlmodel import Session, select

from db import create_db_and_tables, get_session, User, ChatMessage
from auth import get_password_hash, verify_password, create_access_token, decode_access_token

from llm import OllamaClient
from router import decide_route
from search import search_and_scrape, build_context_block


load_dotenv()

app = FastAPI(title="Gemma AI Chat", version="1.0.0")

origins = [
    o.strip()
    for o in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    create_db_and_tables()

ollama = OllamaClient()


def get_system_prompt() -> str:
    now = datetime.datetime.now().strftime("%B %d, %Y at %I:%M %p")
    return (
        f"You are Gemma AI, a helpful, deeply knowledgeable, and highly detailed assistant. "
        f"The current date and time is {now}. "
        "IMPORTANT: Always respond in the SAME language that the user uses (e.g., if the user asks in Japanese, answer in Japanese). "
        "Provide a comprehensive, highly detailed summary based on the gathered information. Give the user 'big information' by explaining topics thoroughly. "
        "Answer in clear Markdown. Use code blocks for code. "
        "When web search results are provided, prefer them for facts and cite sources "
        "as [1], [2] matching the numbered list. If you don't know, say so."
    )


class HealthResponse(BaseModel):
    ok: bool
    ollama: bool
    model: str
    available_models: List[str]


class UserAuth(BaseModel):
    username: str
    password: str

@app.post("/api/register")
def register(user: UserAuth, session: Session = Depends(get_session)):
    if session.exec(select(User).where(User.username == user.username)).first():
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user = User(username=user.username, hashed_password=get_password_hash(user.password))
    session.add(db_user)
    session.commit()
    return {"message": "User registered successfully"}

@app.post("/api/login")
def login(user: UserAuth, session: Session = Depends(get_session)):
    db_user = session.exec(select(User).where(User.username == user.username)).first()
    if not db_user or not verify_password(user.password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    ok_ollama = await ollama.health()
    models = await ollama.list_models() if ok_ollama else []
    return HealthResponse(
        ok=True, ollama=ok_ollama, model=ollama.model, available_models=models
    )


def _build_messages(history: List[Dict[str, str]], context: str) -> List[Dict[str, str]]:
    """Build the message list sent to Ollama.

    Injects the system prompt and (optionally) the web context as a second
    system message so the model treats it as authoritative reference.
    """
    messages: List[Dict[str, str]] = [{"role": "system", "content": get_system_prompt()}]
    if context:
        messages.append({"role": "system", "content": context})
    for m in history:
        role = m.get("role", "user")
        if role not in {"user", "assistant", "system"}:
            role = "user"
        messages.append({"role": role, "content": m.get("content", "")})
    return messages


@app.websocket("/ws/chat")
async def chat_ws(ws: WebSocket):
    token = ws.query_params.get("token")
    if not token:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return
    username = decode_access_token(token)
    if not username:
        await ws.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws.accept()
    try:
        while True:
            raw = await ws.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                await ws.send_json({"type": "error", "message": "invalid json"})
                continue

            history: List[Dict[str, str]] = payload.get("messages") or []
            model: str | None = payload.get("model")

            if not history:
                await ws.send_json({"type": "error", "message": "messages required"})
                continue

            last_user = next(
                (m for m in reversed(history) if m.get("role") == "user"), None
            )
            user_text = (last_user or {}).get("content", "")

            await ws.send_json({"type": "status", "stage": "thinking"})

            # Routing: decide whether to do a web search.
            decision = decide_route(user_text)
            context_block = ""
            sources_payload: List[Dict[str, Any]] = []

            if decision.needs_search:
                await ws.send_json({"type": "status", "stage": "searching"})
                try:
                    results = await search_and_scrape(decision.search_query)
                except Exception as e:
                    results = []
                    await ws.send_json(
                        {"type": "error", "message": f"search failed: {e}"}
                    )

                if results:
                    await ws.send_json({"type": "status", "stage": "scraping"})
                    context_block = build_context_block(results)
                    sources_payload = [
                        {
                            "title": r.title or r.url,
                            "url": r.url,
                            "snippet": r.snippet,
                        }
                        for r in results
                        if r.url
                    ]
                    await ws.send_json(
                        {"type": "sources", "sources": sources_payload}
                    )

            await ws.send_json({"type": "status", "stage": "generating"})
            messages = _build_messages(history, context_block)

            try:
                async for chunk in ollama.chat_stream(messages, model=model):
                    await ws.send_json({"type": "token", "content": chunk})
            except Exception as e:
                await ws.send_json(
                    {"type": "error", "message": f"LLM error: {e}"}
                )
                continue

            await ws.send_json({"type": "done"})
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        reload=False,
    )
