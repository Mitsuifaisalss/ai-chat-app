"""Ollama LLM client.

Thin async wrapper around the Ollama HTTP API. Provides a streaming
``generate`` helper used by the FastAPI WebSocket endpoint.
"""

from __future__ import annotations

import json
import os
from typing import AsyncIterator, List, Dict, Any

import httpx


class OllamaClient:
    def __init__(self, host: str | None = None, model: str | None = None) -> None:
        self.host = (host or os.getenv("OLLAMA_HOST", "http://localhost:11434")).rstrip("/")
        self.model = model or os.getenv("OLLAMA_MODEL", "gemma3")

    async def health(self) -> bool:
        """Return True if the Ollama server responds."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.host}/api/tags")
                return r.status_code == 200
        except Exception:
            return False

    async def list_models(self) -> List[str]:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{self.host}/api/tags")
                r.raise_for_status()
                data = r.json()
                return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            return []

    async def chat_stream(
        self,
        messages: List[Dict[str, str]],
        model: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[str]:
        """Stream chat completion tokens from Ollama.

        Yields incremental text chunks. Uses Ollama's ``/api/chat`` streaming
        endpoint which returns newline-delimited JSON.
        """
        payload: Dict[str, Any] = {
            "model": model or self.model,
            "messages": messages,
            "stream": True,
            "options": {"temperature": temperature},
        }

        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream(
                "POST", f"{self.host}/api/chat", json=payload
            ) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    raise RuntimeError(
                        f"Ollama error {response.status_code}: {body.decode(errors='ignore')}"
                    )
                async for line in response.aiter_lines():
                    if not line:
                        continue
                    try:
                        obj = json.loads(line)
                    except json.JSONDecodeError:
                        continue
                    msg = obj.get("message") or {}
                    chunk = msg.get("content", "")
                    if chunk:
                        yield chunk
                    if obj.get("done"):
                        break
