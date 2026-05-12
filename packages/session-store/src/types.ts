import type { sessionEntries, sessions, workspaces } from "./schema.js";

export type WorkspaceScope = "dm" | "group" | "channel" | "thread" | "local";

export type WorkspaceSource = "cli" | "telegram" | "scheduler";

export type WorkspacePlatform = "cli" | "telegram" | "slack" | "discord";

export type WorkspaceRecord = typeof workspaces.$inferSelect;

export interface WorkspaceResolveInput {
  source: WorkspaceSource;
  platform?: WorkspacePlatform;
  scope: WorkspaceScope;
  chatId?: string;
  threadId?: string;
  agentId: string;
  cwd?: string;
}

export type SessionRecord = typeof sessions.$inferSelect;

export type SessionEntryRecord = typeof sessionEntries.$inferSelect;
