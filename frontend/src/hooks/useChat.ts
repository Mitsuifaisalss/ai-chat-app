import { useCallback, useEffect, useRef, useState } from "react";
import type { Chat, Message, Source, Stage } from "../types";

function getStorageKey(username: string) {
  return `gemma-ai-chats-${username}`;
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function loadChats(username: string): Chat[] {
  try {
    const raw = localStorage.getItem(getStorageKey(username));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Chat[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChats(username: string, chats: Chat[]): void {
  try {
    localStorage.setItem(getStorageKey(username), JSON.stringify(chats));
  } catch {
    /* ignore quota errors */
  }
}

function wsURL(token: string): string {
  // Use vite's dev-server proxy in dev; same-origin in prod build.
  const proto = window.location.protocol === "https:" ? "wss" : "ws";
  return `${proto}://${window.location.host}/ws/chat?token=${token}`;
}

/** Top-level chat state hook. Owns chats, current chat, the WS, and streaming. */
export function useChat(username: string, token: string) {
  const [chats, setChats] = useState<Chat[]>(() => loadChats(username));
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const stored = loadChats(username);
    return stored[0]?.id ?? null;
  });
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const streamingIdRef = useRef<string | null>(null);

  // Persist chats whenever they change.
  useEffect(() => {
    saveChats(username, chats);
  }, [chats, username]);

  const currentChat = chats.find((c) => c.id === currentId) ?? null;
  const isStreaming = stage !== "idle";

  const newChat = useCallback((): string => {
    const chat: Chat = {
      id: uid(),
      title: "New chat",
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats((cs) => [chat, ...cs]);
    setCurrentId(chat.id);
    setError(null);
    return chat.id;
  }, []);

  const selectChat = useCallback((id: string) => {
    setCurrentId(id);
    setError(null);
  }, []);

  const deleteChat = useCallback(
    (id: string) => {
      setChats((cs) => {
        const next = cs.filter((c) => c.id !== id);
        if (currentId === id) {
          setCurrentId(next[0]?.id ?? null);
        }
        return next;
      });
    },
    [currentId]
  );

  const renameChat = useCallback((id: string, title: string) => {
    setChats((cs) => cs.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  /** Update the message currently being streamed in the current chat. */
  const patchStreaming = useCallback(
    (chatId: string, msgId: string, patch: Partial<Message>) => {
      setChats((cs) =>
        cs.map((c) =>
          c.id !== chatId
            ? c
            : {
                ...c,
                updatedAt: Date.now(),
                messages: c.messages.map((m) =>
                  m.id === msgId ? { ...m, ...patch } : m
                ),
              }
        )
      );
    },
    []
  );

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming) return;

      // Ensure we have a chat.
      let chatId = currentId;
      if (!chatId) {
        chatId = newChat();
      }

      const userMsg: Message = {
        id: uid(),
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      const assistantMsg: Message = {
        id: uid(),
        role: "assistant",
        content: "",
        streaming: true,
        createdAt: Date.now(),
      };
      streamingIdRef.current = assistantMsg.id;

      // Append both, plus auto-title if first message.
      let history: Message[] = [];
      
      setChats((cs) =>
        cs.map((c) => {
          if (c.id !== chatId) return c;
          const msgs = [...c.messages, userMsg, assistantMsg];
          history = [...c.messages, userMsg];
          const title =
            c.messages.length === 0
              ? trimmed.length > 48
                ? trimmed.slice(0, 48) + "…"
                : trimmed
              : c.title;
          return { ...c, title, messages: msgs, updatedAt: Date.now() };
        })
      );

      // Inject location data if this is the first message in the chat (history only has the user message).
      if (history.length === 1 && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000 });
          });
          history.unshift({
            id: uid(),
            role: "system",
            content: `User's current location: Latitude ${pos.coords.latitude}, Longitude ${pos.coords.longitude}`,
            createdAt: Date.now(),
          } as Message);
        } catch (e) {
          // Location access denied or timed out
        }
      }

      setError(null);
      setStage("thinking");

      // Open a fresh WS per request — simpler than reusing one.
      const ws = new WebSocket(wsURL(token));
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            messages: history.map((m) => ({ role: m.role, content: m.content })),
          })
        );
      };

      ws.onmessage = (ev) => {
        let data: any;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (!chatId) return;

        switch (data.type) {
          case "status":
            setStage((data.stage as Stage) || "generating");
            break;
          case "sources": {
            const sources = (data.sources || []) as Source[];
            patchStreaming(chatId, assistantMsg.id, { sources });
            break;
          }
          case "token": {
            const chunk = String(data.content ?? "");
            setChats((cs) =>
              cs.map((c) =>
                c.id !== chatId
                  ? c
                  : {
                      ...c,
                      updatedAt: Date.now(),
                      messages: c.messages.map((m) =>
                        m.id === assistantMsg.id
                          ? { ...m, content: m.content + chunk }
                          : m
                      ),
                    }
              )
            );
            break;
          }
          case "error":
            setError(String(data.message ?? "unknown error"));
            break;
          case "done":
            patchStreaming(chatId, assistantMsg.id, { streaming: false });
            setStage("idle");
            ws.close();
            break;
        }
      };

      ws.onerror = () => {
        setError("Connection error. Is the backend running on :8000?");
      };

      ws.onclose = () => {
        // Make sure we stop spinners even if `done` never arrived.
        if (streamingIdRef.current && chatId) {
          patchStreaming(chatId, streamingIdRef.current, { streaming: false });
        }
        setStage("idle");
        streamingIdRef.current = null;
        wsRef.current = null;
      };
    },
    [currentId, isStreaming, newChat, patchStreaming]
  );

  const stop = useCallback(() => {
    wsRef.current?.close();
  }, []);

  return {
    chats,
    currentChat,
    currentId,
    stage,
    isStreaming,
    error,
    newChat,
    selectChat,
    deleteChat,
    renameChat,
    sendMessage,
    stop,
  };
}
