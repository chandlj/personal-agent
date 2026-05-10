export interface SessionRecord {
  id: string;
  key: string;
  source: "cli" | "telegram" | "scheduler";
  createdAt: string;
}

export interface TranscriptRecord {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  createdAt: string;
}

export interface JobRecord {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  createdAt: string;
}
