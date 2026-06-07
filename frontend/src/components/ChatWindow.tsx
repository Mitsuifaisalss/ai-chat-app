import { useEffect, useRef } from "react";
import type { Chat, Stage } from "../types";
import MessageBubble from "./MessageBubble";
import SearchIndicator from "./SearchIndicator";

interface Props {
  chat: Chat | null;
  stage: Stage;
  error: string | null;
}

const SUGGESTIONS = [
  "What is the latest news about AI?",
  "Explain quantum computing in simple terms",
  "Write a Python function to reverse a string",
  "Who won the most recent FIFA World Cup?",
];

export default function ChatWindow({ chat, stage, error }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages / streamed tokens.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [chat?.messages, stage]);

  const isEmpty = !chat || chat.messages.length === 0;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-3 md:px-6 py-6">
        {isEmpty ? (
          <Empty />
        ) : (
          <div className="space-y-5">
            {chat!.messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {stage !== "idle" && (
              <div className="pl-11">
                <SearchIndicator stage={stage} />
              </div>
            )}
            {error && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-sm px-3 py-2">
                {error}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  function Empty() {
    return (
      <div className="flex flex-col items-center justify-center text-center py-16">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center text-white text-2xl font-bold mb-4">
          G
        </div>
        <h1 className="text-2xl md:text-3xl font-semibold mb-2">
          How can I help you today?
        </h1>
        <p className="text-zinc-500 max-w-md mb-8">
          Powered by a local LLM with on-demand web search. Your conversations
          stay on your machine.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
          {SUGGESTIONS.map((s) => (
            <SuggestionButton key={s} text={s} />
          ))}
        </div>
      </div>
    );
  }
}

function SuggestionButton({ text }: { text: string }) {
  return (
    <button
      onClick={() => {
        // Dispatch a custom event so App can pick it up without prop drilling.
        window.dispatchEvent(
          new CustomEvent<string>("chat:suggestion", { detail: text })
        );
      }}
      className="text-left px-4 py-3 rounded-xl border border-line bg-bg-soft hover:bg-bg-hover [html:not(.dark)_&]:bg-zinc-50 [html:not(.dark)_&]:hover:bg-zinc-100 [html:not(.dark)_&]:border-zinc-200 text-sm text-zinc-300 [html:not(.dark)_&]:text-zinc-700 transition"
    >
      {text}
    </button>
  );
}
