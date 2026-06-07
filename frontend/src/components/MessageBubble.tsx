import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Message } from "../types";
import SourceCitations from "./SourceCitations";

interface Props {
  message: Message;
}

export default function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div
      className={[
        "flex gap-3 animate-fadein",
        isUser ? "justify-end" : "justify-start",
      ].join(" ")}
    >
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-accent to-accent-soft flex items-center justify-center text-white text-sm font-bold">
          G
        </div>
      )}
      <div
        className={[
          "max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
          isUser
            ? "bg-accent text-white rounded-tr-sm"
            : "bg-bg-panel border border-line text-zinc-100 rounded-tl-sm dark:text-zinc-100",
          !isUser ? "[html:not(.dark)_&]:bg-zinc-50 [html:not(.dark)_&]:text-zinc-900 [html:not(.dark)_&]:border-zinc-200" : "",
        ].join(" ")}
      >
        {isUser ? (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        ) : (
          <>
            <div className="md break-words">
              {message.content ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              ) : message.streaming ? (
                <span className="inline-flex gap-1 items-center text-zinc-400 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-blink" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-blink [animation-delay:200ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-blink [animation-delay:400ms]" />
                </span>
              ) : null}
              {message.streaming && message.content && (
                <span className="inline-block w-2 h-4 bg-accent-soft align-middle ml-0.5 animate-blink" />
              )}
            </div>
            {message.sources && message.sources.length > 0 && (
              <SourceCitations sources={message.sources} />
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-bg-panel border border-line flex items-center justify-center text-zinc-300 text-sm font-medium">
          U
        </div>
      )}
    </div>
  );
}
