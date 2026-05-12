import { sql } from "drizzle-orm";
import {
  type AnySQLiteColumn,
  check,
  foreignKey,
  index,
  sqliteTable,
  text,
  unique,
  uniqueIndex
} from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    workspaceKey: text("workspace_key").notNull().unique(),
    agentId: text("agent_id").notNull(),
    platform: text("platform"),
    chatId: text("chat_id"),
    threadId: text("thread_id"),
    parentWorkspaceId: text("parent_workspace_id").references((): AnySQLiteColumn => workspaces.id),
    rootPath: text("root_path").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastUsedAt: text("last_used_at").notNull()
  },
  (table) => [
    index("workspaces_platform_chat_idx").on(table.platform, table.chatId),
    index("workspaces_parent_workspace_id_idx").on(table.parentWorkspaceId)
  ]
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id),
    sessionKey: text("session_key").notNull(),
    parentSessionId: text("parent_session_id").references((): AnySQLiteColumn => sessions.id),
    runtimeProvider: text("runtime_provider").notNull(),
    runtimeSessionId: text("runtime_session_id"),
    runtimeSessionPath: text("runtime_session_path"),
    activeLeafEntryId: text("active_leaf_entry_id").references(
      (): AnySQLiteColumn => sessionEntries.id
    ),
    source: text("source", { enum: ["cli", "telegram", "scheduler"] }).notNull(),
    title: text("title"),
    status: text("status", { enum: ["active", "archived", "closed"] }).notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    lastMessageAt: text("last_message_at")
  },
  (table) => [
    index("sessions_session_key_idx").on(table.sessionKey),
    uniqueIndex("sessions_active_session_key_idx")
      .on(table.sessionKey)
      .where(sql`${table.status} = 'active'`),
    index("sessions_workspace_id_idx").on(table.workspaceId),
    index("sessions_parent_session_id_idx").on(table.parentSessionId),
    index("sessions_runtime_identity_idx").on(table.runtimeProvider, table.runtimeSessionId),
    index("sessions_source_idx").on(table.source),
    unique("sessions_id_active_leaf_unique").on(table.id, table.activeLeafEntryId),
    check("sessions_source_check", sql`${table.source} IN ('cli', 'telegram', 'scheduler')`),
    check("sessions_status_check", sql`${table.status} IN ('active', 'archived', 'closed')`),
    foreignKey({
      name: "sessions_active_leaf_same_session_fk",
      columns: [table.id, table.activeLeafEntryId],
      foreignColumns: [sessionEntries.sessionId, sessionEntries.id]
    })
  ]
);

export const sessionEntries = sqliteTable(
  "session_entries",
  {
    id: text("id").primaryKey(),
    sessionId: text("session_id")
      .notNull()
      .references((): AnySQLiteColumn => sessions.id),
    parentEntryId: text("parent_entry_id").references((): AnySQLiteColumn => sessionEntries.id),
    runtimeEntryId: text("runtime_entry_id"),
    entryType: text("entry_type", {
      enum: [
        "message",
        "state_change",
        "compaction",
        "branch_summary",
        "label",
        "metadata",
        "custom"
      ]
    }).notNull(),
    role: text("role", { enum: ["system", "user", "assistant", "tool", "custom"] }),
    messageType: text("message_type", {
      enum: ["text", "attachment", "tool_call", "tool_result", "status"]
    }),
    text: text("text"),
    payloadJson: text("payload_json", { mode: "json" }).$type<Record<string, unknown>>(),
    runtimePayloadJson: text("runtime_payload_json", { mode: "json" }).$type<
      Record<string, unknown>
    >(),
    createdAt: text("created_at").notNull()
  },
  (table) => [
    index("session_entries_session_created_at_idx").on(table.sessionId, table.createdAt),
    index("session_entries_session_parent_idx").on(table.sessionId, table.parentEntryId),
    unique("session_entries_session_id_id_unique").on(table.sessionId, table.id),
    uniqueIndex("session_entries_runtime_entry_idx")
      .on(table.sessionId, table.runtimeEntryId)
      .where(sql`${table.runtimeEntryId} IS NOT NULL`),
    check(
      "session_entries_entry_type_check",
      sql`${table.entryType} IN ('message', 'state_change', 'compaction', 'branch_summary', 'label', 'metadata', 'custom')`
    ),
    check(
      "session_entries_role_check",
      sql`${table.role} IS NULL OR ${table.role} IN ('system', 'user', 'assistant', 'tool', 'custom')`
    ),
    check(
      "session_entries_message_type_check",
      sql`${table.messageType} IS NULL OR ${table.messageType} IN ('text', 'attachment', 'tool_call', 'tool_result', 'status')`
    ),
    foreignKey({
      name: "session_entries_parent_same_session_fk",
      columns: [table.sessionId, table.parentEntryId],
      foreignColumns: [table.sessionId, table.id]
    })
  ]
);
