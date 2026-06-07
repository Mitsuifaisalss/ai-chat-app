import type { Source } from "../types";

interface Props {
  sources: Source[];
}

export default function SourceCitations({ sources }: Props) {
  if (!sources?.length) return null;

  return (
    <div className="mt-3 pt-3 border-t border-line/60">
      <div className="text-xs uppercase tracking-wide text-zinc-500 mb-2">
        Sources
      </div>
      <ol className="flex flex-wrap gap-2">
        {sources.map((s, i) => {
          let host = s.url;
          try {
            host = new URL(s.url).hostname.replace(/^www\./, "");
          } catch {
            /* keep raw */
          }
          return (
            <li key={s.url + i}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                title={s.title}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-bg-soft hover:bg-bg-hover border border-line text-xs text-zinc-300 hover:text-white transition max-w-xs"
              >
                <span className="text-accent-soft font-mono">[{i + 1}]</span>
                <span className="truncate">{host}</span>
                <svg
                  viewBox="0 0 24 24"
                  className="w-3 h-3 shrink-0 text-zinc-500"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M14 3h7v7M10 14L21 3M21 14v7H3V3h7" />
                </svg>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
