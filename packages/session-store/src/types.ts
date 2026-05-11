export interface SessionRecord {
  id: string;
  workspaceId: string;
  agentId: string;
  sessionKey: string;
  parentSessionId: string | null;
  runtimeProvider: string;
  runtimeSessionId: string | null;
  runtimeSessionPath: string | null;
  activeLeafEntryId: string | null;
  source: "cli" | "telegram";
  platform: string | null;
  chatId: string | null;
  threadId: string | null;
  title: string | null;
  status: "active" | "archived" | "closed";
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
}

export interface SessionEntryRecord {
  id: string;
  sessionId: string;
  parentEntryId: string | null;
  runtimeEntryId: string | null;
  entryType:
    | "message"
    | "state_change"
    | "compaction"
    | "branch_summary"
    | "label"
    | "metadata"
    | "custom";
  role: "user" | "assistant" | "system" | "tool" | "custom" | null;
  messageType: "text" | "attachment" | "tool_call" | "tool_result" | "status" | null;
  text: string | null;
  payloadJson: Record<string, unknown> | null;
  runtimePayloadJson: Record<string, unknown> | null;
  createdAt: string;
}
