import { join } from "node:path";

export interface MigrationDefinition {
  version: number;
  name: string;
  fileName: string;
}

export const SESSION_STORE_MIGRATIONS: MigrationDefinition[] = [
  { version: 1, name: "initial", fileName: "0001_initial.sql" },
  { version: 2, name: "inter_agent", fileName: "0002_inter_agent.sql" }
];

export function defaultDatabasePath(homeDir: string): string {
  return join(homeDir, ".personal-agent", "state", "state.db");
}
