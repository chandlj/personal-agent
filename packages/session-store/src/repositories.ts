import type { JobRecord, SessionRecord, TranscriptRecord } from "./types.js";

export interface SessionRepository {
  save(session: SessionRecord): Promise<void>;
  getByKey(key: string): Promise<SessionRecord | null>;
}

export interface TranscriptRepository {
  append(entry: TranscriptRecord): Promise<void>;
  listBySession(sessionId: string): Promise<TranscriptRecord[]>;
}

export interface JobRepository {
  save(job: JobRecord): Promise<void>;
  listEnabled(): Promise<JobRecord[]>;
}
