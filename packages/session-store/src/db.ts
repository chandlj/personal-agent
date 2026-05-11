import { Database } from "bun:sqlite";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type BunSQLiteDatabase, drizzle } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";
import * as schema from "./schema.js";

export interface AppliedMigration {
  id: number | null;
  hash: string;
  createdAt: number;
}

export interface OpenSessionStoreInput {
  databasePath?: string;
  homeDir?: string;
  migrationsFolder?: string;
}

export interface SessionStoreDatabase {
  readonly path: string;
  readonly sqlite: Database;
  readonly db: BunSQLiteDatabase<typeof schema>;
  listAppliedMigrations(): AppliedMigration[];
  close(): void;
}

export function defaultDatabasePath(homeDir: string): string {
  return join(homeDir, ".personal-agent", "state", "state.db");
}

export async function openSessionStore(
  input: OpenSessionStoreInput = {}
): Promise<SessionStoreDatabase> {
  const databasePath =
    input.databasePath ?? defaultDatabasePath(input.homeDir ?? process.env.HOME ?? ".");

  if (!isMemoryDatabase(databasePath)) {
    await mkdir(dirname(databasePath), { recursive: true });
  }

  const sqlite = new Database(databasePath, {
    create: true,
    readwrite: true,
    strict: true
  });

  try {
    sqlite.exec("PRAGMA foreign_keys = ON;");
    const db = drizzle(sqlite, { schema });
    migrate(db, { migrationsFolder: input.migrationsFolder ?? defaultMigrationsFolder() });

    return {
      path: databasePath,
      sqlite,
      db,
      listAppliedMigrations: () => listAppliedMigrations(sqlite),
      close: () => sqlite.close()
    };
  } catch (error) {
    sqlite.close();
    throw error;
  }
}

export function listAppliedMigrations(sqlite: Database): AppliedMigration[] {
  return sqlite
    .query<
      {
        id: number | null;
        hash: string;
        createdAt: number;
      },
      []
    >(
      `
        SELECT id, hash, created_at AS createdAt
        FROM __drizzle_migrations
        ORDER BY created_at ASC;
      `
    )
    .all();
}

function defaultMigrationsFolder(): string {
  return fileURLToPath(new URL("../drizzle", import.meta.url));
}

function isMemoryDatabase(databasePath: string): boolean {
  return databasePath === ":memory:" || databasePath === "";
}
