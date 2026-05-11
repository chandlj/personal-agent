CREATE TABLE `session_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`parent_entry_id` text,
	`runtime_entry_id` text,
	`entry_type` text NOT NULL,
	`role` text,
	`message_type` text,
	`text` text,
	`payload_json` text,
	`runtime_payload_json` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_entry_id`) REFERENCES `session_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`,`parent_entry_id`) REFERENCES `session_entries`(`session_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_entries_entry_type_check" CHECK("session_entries"."entry_type" IN ('message', 'state_change', 'compaction', 'branch_summary', 'label', 'metadata', 'custom')),
	CONSTRAINT "session_entries_role_check" CHECK("session_entries"."role" IS NULL OR "session_entries"."role" IN ('system', 'user', 'assistant', 'tool', 'custom')),
	CONSTRAINT "session_entries_message_type_check" CHECK("session_entries"."message_type" IS NULL OR "session_entries"."message_type" IN ('text', 'attachment', 'tool_call', 'tool_result', 'status'))
);
--> statement-breakpoint
CREATE INDEX `session_entries_session_created_at_idx` ON `session_entries` (`session_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `session_entries_session_parent_idx` ON `session_entries` (`session_id`,`parent_entry_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `session_entries_runtime_entry_idx` ON `session_entries` (`session_id`,`runtime_entry_id`) WHERE "session_entries"."runtime_entry_id" IS NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `session_entries_session_id_id_unique` ON `session_entries` (`session_id`,`id`);--> statement-breakpoint
CREATE VIRTUAL TABLE `session_entries_fts` USING fts5(
  `entry_id` UNINDEXED,
  `session_id` UNINDEXED,
  `text`
);
--> statement-breakpoint
CREATE TRIGGER `session_entries_ai`
AFTER INSERT ON `session_entries`
BEGIN
  INSERT INTO `session_entries_fts` (`entry_id`, `session_id`, `text`)
  VALUES (new.`id`, new.`session_id`, new.`text`);
END;
--> statement-breakpoint
CREATE TRIGGER `session_entries_ad`
AFTER DELETE ON `session_entries`
BEGIN
  DELETE FROM `session_entries_fts` WHERE `entry_id` = old.`id`;
END;
--> statement-breakpoint
CREATE TRIGGER `session_entries_au`
AFTER UPDATE ON `session_entries`
BEGIN
  DELETE FROM `session_entries_fts` WHERE `entry_id` = old.`id`;
  INSERT INTO `session_entries_fts` (`entry_id`, `session_id`, `text`)
  VALUES (new.`id`, new.`session_id`, new.`text`);
END;
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`session_key` text NOT NULL,
	`parent_session_id` text,
	`runtime_provider` text NOT NULL,
	`runtime_session_id` text,
	`runtime_session_path` text,
	`active_leaf_entry_id` text,
	`source` text NOT NULL,
	`platform` text,
	`chat_id` text,
	`thread_id` text,
	`title` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_message_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_leaf_entry_id`) REFERENCES `session_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id`,`active_leaf_entry_id`) REFERENCES `session_entries`(`session_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessions_status_check" CHECK("sessions"."status" IN ('active', 'archived', 'closed'))
);
--> statement-breakpoint
CREATE INDEX `sessions_session_key_idx` ON `sessions` (`session_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_active_session_key_idx` ON `sessions` (`session_key`) WHERE "sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX `sessions_workspace_id_idx` ON `sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `sessions_parent_session_id_idx` ON `sessions` (`parent_session_id`);--> statement-breakpoint
CREATE INDEX `sessions_runtime_identity_idx` ON `sessions` (`runtime_provider`,`runtime_session_id`);--> statement-breakpoint
CREATE INDEX `sessions_source_idx` ON `sessions` (`source`);--> statement-breakpoint
CREATE INDEX `sessions_platform_chat_idx` ON `sessions` (`platform`,`chat_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_id_active_leaf_unique` ON `sessions` (`id`,`active_leaf_entry_id`);--> statement-breakpoint
CREATE TABLE `workspaces` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_key` text NOT NULL,
	`agent_id` text NOT NULL,
	`platform` text,
	`chat_id` text,
	`thread_id` text,
	`parent_workspace_id` text,
	`root_path` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_used_at` text NOT NULL,
	FOREIGN KEY (`parent_workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `workspaces_workspace_key_unique` ON `workspaces` (`workspace_key`);--> statement-breakpoint
CREATE INDEX `workspaces_platform_chat_idx` ON `workspaces` (`platform`,`chat_id`);--> statement-breakpoint
CREATE INDEX `workspaces_parent_workspace_id_idx` ON `workspaces` (`parent_workspace_id`);
