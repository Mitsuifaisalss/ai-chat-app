import type { Chat } from "../types";

interface SidebarProps {
  chats: Chat[];
  currentId: string | null;
  onNewChat: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export default function Sidebar({
  chats,
  currentId,
  onNewChat,
  onSelect,
  onDelete,
  isOpen,
  onClose,
  isDark,
  onToggleTheme,
}: SidebarProps) {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={[
          "fixed md:static z-40 inset-y-0 left-0 w-72 shrink-0",
          "bg-bg-soft dark:bg-bg-soft border-r border-line",
          "flex flex-col",
          "transition-transform duration-200 ease-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" ")}
      >
        <div className="p-3 border-b border-line flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-4 h-4 text-white"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold leading-tight">Gemma AI</div>
            <div className="text-xs text-zinc-500 leading-tight">
              Local LLM + web search
            </div>
          </div>
          <button
            className="md:hidden p-1.5 rounded hover:bg-bg-hover text-zinc-400"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6l12 12M6 18L18 6" />
            </svg>
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-accent hover:bg-accent-soft text-white font-medium transition"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {chats.length === 0 ? (
            <div className="text-center text-xs text-zinc-500 mt-6 px-3">
              No chats yet. Start a conversation.
            </div>
          ) : (
            <ul className="space-y-1">
              {chats.map((c) => {
                const active = c.id === currentId;
                return (
                  <li key={c.id}>
                    <div
                      className={[
                        "group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm",
                        active
                          ? "bg-bg-hover text-zinc-100"
                          : "text-zinc-300 hover:bg-bg-hover/60",
                      ].join(" ")}
                      onClick={() => onSelect(c.id)}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-4 h-4 shrink-0 text-zinc-500"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                      </svg>
                      <span className="flex-1 truncate">{c.title}</span>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition text-zinc-500 hover:text-red-400 p-0.5"
                        aria-label="Delete chat"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete(c.id);
                        }}
                      >
                        <svg
                          viewBox="0 0 24 24"
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="p-3 border-t border-line">
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-bg-panel hover:bg-bg-hover text-sm text-zinc-300 transition"
          >
            {isDark ? (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
                Light mode
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
                Dark mode
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
