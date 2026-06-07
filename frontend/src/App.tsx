import { useEffect, useState } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import InputArea from "./components/InputArea";
import { Auth } from "./components/Auth";
import { LiveMode } from "./components/LiveMode";
import { useChat } from "./hooks/useChat";

export default function App() {
  const [token, setToken] = useState<string>(() => localStorage.getItem("gemma-token") || "");
  const [username, setUsername] = useState<string>(() => localStorage.getItem("gemma-username") || "");

  const handleLogin = (t: string, u: string) => {
    localStorage.setItem("gemma-token", t);
    localStorage.setItem("gemma-username", u);
    setToken(t);
    setUsername(u);
  };

  const handleLogout = () => {
    localStorage.removeItem("gemma-token");
    localStorage.removeItem("gemma-username");
    setToken("");
    setUsername("");
  };

  if (!token || !username) {
    return <Auth onLogin={handleLogin} />;
  }

  return <ChatApp token={token} username={username} onLogout={handleLogout} />;
}

function ChatApp({ token, username, onLogout }: { token: string; username: string; onLogout: () => void }) {
  const {
    chats,
    currentChat,
    currentId,
    stage,
    isStreaming,
    error,
    newChat,
    selectChat,
    deleteChat,
    sendMessage,
    stop,
  } = useChat(username, token);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [isDark, setIsDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  // Suggestion clicks from the empty state.
  useEffect(() => {
    const onSuggestion = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      if (detail) sendMessage(detail);
    };
    window.addEventListener("chat:suggestion", onSuggestion);
    return () => window.removeEventListener("chat:suggestion", onSuggestion);
  }, [sendMessage]);

  return (
    <div className="h-full flex bg-bg [html:not(.dark)_&]:bg-white">
      <Sidebar
        chats={chats}
        currentId={currentId}
        onNewChat={() => {
          newChat();
          setSidebarOpen(false);
        }}
        onSelect={(id) => {
          selectChat(id);
          setSidebarOpen(false);
        }}
        onDelete={deleteChat}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isDark={isDark}
        onToggleTheme={toggleTheme}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between px-3 py-2 border-b border-line">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-bg-hover text-zinc-300"
            aria-label="Open sidebar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
          <div className="font-semibold">Gemma AI</div>
          <button onClick={onLogout} className="text-sm text-zinc-400 hover:text-zinc-200">Logout</button>
        </header>

        <div className="hidden md:flex justify-end p-2 border-b border-line">
          <div className="flex items-center gap-4">
            <span className="text-sm text-zinc-400">Logged in as <strong className="text-emerald-400">{username}</strong></span>
            <button onClick={onLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
          </div>
        </div>

        <ChatWindow chat={currentChat} stage={stage} error={error} />

        <InputArea
          onSend={sendMessage}
          disabled={isStreaming}
          isStreaming={isStreaming}
          onStop={stop}
          onLiveMode={() => setIsLiveMode(true)}
        />
      </main>

      {isLiveMode && (
        <LiveMode
          onClose={() => setIsLiveMode(false)}
          onSend={sendMessage}
          isStreaming={isStreaming}
          stage={stage}
          lastAssistantMessage={
            currentChat?.messages
              .filter((m) => m.role === "assistant")
              .slice(-1)[0]?.content || ""
          }
        />
      )}
    </div>
  );
}
