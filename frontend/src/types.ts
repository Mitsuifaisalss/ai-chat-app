export type Role = "user" | "assistant" | "system";

export interface Source {
  title: string;
  url: string;
  snippet?: string;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  sources?: Source[];
  /** When true, the assistant message is still being streamed in. */
  streaming?: boolean;
  createdAt: number;
}

export type Stage = "idle" | "thinking" | "searching" | "scraping" | "generating";

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
