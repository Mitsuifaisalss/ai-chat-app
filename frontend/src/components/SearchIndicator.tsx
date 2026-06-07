import type { Stage } from "../types";

interface Props {
  stage: Stage;
}

const LABELS: Record<Stage, string> = {
  idle: "",
  thinking: "Thinking…",
  searching: "Searching the web…",
  scraping: "Reading sources…",
  generating: "Generating response…",
};

export default function SearchIndicator({ stage }: Props) {
  if (stage === "idle") return null;

  const isWeb = stage === "searching" || stage === "scraping";

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-bg-soft border border-line text-xs text-zinc-300 animate-fadein">
      {isWeb ? (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-accent-soft" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
        </svg>
      ) : (
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-blink" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-blink [animation-delay:200ms]" />
          <span className="w-1.5 h-1.5 rounded-full bg-accent-soft animate-blink [animation-delay:400ms]" />
        </span>
      )}
      <span>{LABELS[stage]}</span>
    </div>
  );
}
