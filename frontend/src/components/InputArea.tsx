import { useEffect, useRef, useState } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  isStreaming: boolean;
  onStop: () => void;
  onLiveMode?: () => void;
}

export default function InputArea({ onSend, disabled, isStreaming, onStop, onLiveMode }: Props) {
  const [value, setValue] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to a max height.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [value]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (disabled) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setValue("");
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t border-line bg-bg/80 backdrop-blur supports-[backdrop-filter]:bg-bg/60 [html:not(.dark)_&]:bg-white/80"
    >
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-bg-soft [html:not(.dark)_&]:bg-zinc-50 [html:not(.dark)_&]:border-zinc-200 px-3 py-2 focus-within:border-accent/60 transition">
          <textarea
            ref={taRef}
            rows={1}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask Gemma anything…"
            className="flex-1 resize-none bg-transparent outline-none text-[15px] placeholder-zinc-500 max-h-[200px] py-1.5"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={onStop}
              className="shrink-0 w-9 h-9 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white flex items-center justify-center transition"
              aria-label="Stop"
              title="Stop generating"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              type="submit"
              disabled={!value.trim()}
              className="shrink-0 w-9 h-9 rounded-lg bg-accent hover:bg-accent-soft disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition"
              aria-label="Send"
              title="Send (Enter)"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </button>
          )}
          {onLiveMode && (
            <button
              type="button"
              onClick={onLiveMode}
              className="shrink-0 w-9 h-9 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center transition"
              aria-label="Live Mode"
              title="Live Voice/Camera Mode"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M23 7l-7 5 7 5V7z"></path>
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
              </svg>
            </button>
          )}
        </div>
        <div className="mt-1.5 text-[11px] text-zinc-500 text-center">
          Gemma AI can make mistakes. Verify important info.
        </div>
      </div>
    </form>
  );
}
