PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`workspace_id` text NOT NULL,
	`session_key` text NOT NULL,
	`parent_session_id` text,
	`runtime_provider` text NOT NULL,
	`runtime_session_id` text,
	`runtime_session_path` text,
	`active_leaf_entry_id` text,
	`source` text NOT NULL,
	`title` text,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_message_at` text,
	FOREIGN KEY (`workspace_id`) REFERENCES `workspaces`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parent_session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`active_leaf_entry_id`) REFERENCES `session_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`id`,`active_leaf_entry_id`) REFERENCES `session_entries`(`session_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sessions_source_check" CHECK("source" IN ('cli', 'telegram', 'scheduler')),
	CONSTRAINT "sessions_status_check" CHECK("status" IN ('active', 'archived', 'closed'))
);
--> statement-breakpoint
INSERT INTO `__new_sessions`("id", "workspace_id", "session_key", "parent_session_id", "runtime_provider", "runtime_session_id", "runtime_session_path", "active_leaf_entry_id", "source", "title", "status", "created_at", "updated_at", "last_message_at") SELECT "id", "workspace_id", "session_key", "parent_session_id", "runtime_provider", "runtime_session_id", "runtime_session_path", "active_leaf_entry_id", "source", "title", "status", "created_at", "updated_at", "last_message_at" FROM `sessions`;--> statement-breakpoint
DROP TABLE `sessions`;--> statement-breakpoint
ALTER TABLE `__new_sessions` RENAME TO `sessions`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `sessions_session_key_idx` ON `sessions` (`session_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_active_session_key_idx` ON `sessions` (`session_key`) WHERE "sessions"."status" = 'active';--> statement-breakpoint
CREATE INDEX `sessions_workspace_id_idx` ON `sessions` (`workspace_id`);--> statement-breakpoint
CREATE INDEX `sessions_parent_session_id_idx` ON `sessions` (`parent_session_id`);--> statement-breakpoint
CREATE INDEX `sessions_runtime_identity_idx` ON `sessions` (`runtime_provider`,`runtime_session_id`);--> statement-breakpoint
CREATE INDEX `sessions_source_idx` ON `sessions` (`source`);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_id_active_leaf_unique` ON `sessions` (`id`,`active_leaf_entry_id`);
