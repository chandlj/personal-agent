import type { SessionEntryRecord, SessionRecord } from "./types.js";

export interface SessionRepository {
  save(session: SessionRecord): Promise<void>;
  getActiveBySessionKey(sessionKey: string): Promise<SessionRecord | null>;
}

export interface SessionEntryRepository {
  append(entry: SessionEntryRecord): Promise<void>;
  listBySession(sessionId: string): Promise<SessionEntryRecord[]>;
  listActiveBranch(sessionId: string): Promise<SessionEntryRecord[]>;
}
