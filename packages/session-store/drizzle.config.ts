import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "drizzle-kit";

const configDir = dirname(fileURLToPath(import.meta.url));
const fromCwd = (path: string) => relative(process.cwd(), path) || ".";

export default defineConfig({
  dialect: "sqlite",
  out: fromCwd(join(configDir, "drizzle")),
  schema: fromCwd(join(configDir, "src/schema.ts"))
});
