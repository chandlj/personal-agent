import type { sessionEntries, sessions } from "./schema.js";

export type SessionRecord = typeof sessions.$inferSelect;

export type SessionEntryRecord = typeof sessionEntries.$inferSelect;
