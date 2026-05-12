import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import type { AppConfig } from "@personal-agent/config";
import { resolveRuntimeResources } from "@personal-agent/config";
import { DefaultResourceLoader, summarizeLoadedResources } from "./resource-loader.js";

describe("DefaultResourceLoader", () => {
  test("loads global and CLI workspace resources deterministically", async () => {
    const root = await mkdtemp(join(tmpdir(), "personal-agent-runtime-"));
    const globalRoot = join(root, "global");
    const workspaceRoot = join(root, "project");
    const workspaceConfigRoot = join(workspaceRoot, ".personal-agent");
    const config = testConfig({ globalRoot, workspaceRoot: join(root, "generated") });

    await writeFileWithDirs(join(globalRoot, "AGENTS.md"), "global agent");
    await writeFileWithDirs(join(globalRoot, "SYSTEM.md"), "global system");
    await writeFileWithDirs(join(globalRoot, "skills", "b.md"), "skill b");
    await writeFileWithDirs(join(globalRoot, "skills", "a.md"), "skill a");
    await writeFileWithDirs(join(globalRoot, "prompts", "daily.md"), "prompt");
    await writeFileWithDirs(join(workspaceConfigRoot, "APPEND_SYSTEM.md"), "workspace append");
    await writeFileWithDirs(join(workspaceConfigRoot, "extensions", "local.ts"), "extension");

    const resources = resolveRuntimeResources({
      config,
      includeWorkspaceResources: true,
      workspaceRoot
    });
    const loaded = await new DefaultResourceLoader({ resources }).load();

    expect(loaded.roots).toHaveLength(2);
    expect(loaded.roots[0]?.files.agents.content).toBe("global agent");
    expect(loaded.roots[0]?.files.system.content).toBe("global system");
    expect(loaded.roots[0]?.directories.skills.entries.map((entry) => entry.name)).toEqual([
      "a.md",
      "b.md"
    ]);
    expect(loaded.roots[1]?.files.appendSystem.content).toBe("workspace append");
    expect(summarizeLoadedResources(loaded)).toContain("global:global:skills(2)");
  });

  test("does not load workspace overrides for generated runtime workspaces", async () => {
    const root = await mkdtemp(join(tmpdir(), "personal-agent-runtime-"));
    const globalRoot = join(root, "global");
    const generatedRoot = join(root, "generated");
    const workspaceRoot = join(generatedRoot, "telegram-chat");
    const config = testConfig({ globalRoot, workspaceRoot: generatedRoot });

    await writeFileWithDirs(join(globalRoot, "AGENTS.md"), "global agent");
    await writeFileWithDirs(join(workspaceRoot, ".personal-agent", "AGENTS.md"), "generated agent");

    const resources = resolveRuntimeResources({
      config,
      includeWorkspaceResources: true,
      workspaceRoot
    });
    const loaded = await new DefaultResourceLoader({ resources }).load();

    expect(loaded.roots).toHaveLength(1);
    expect(loaded.roots[0]?.root).toBe(globalRoot);
    expect(loaded.roots[0]?.files.agents.content).toBe("global agent");
  });
});

function testConfig(input: { globalRoot: string; workspaceRoot: string }): AppConfig {
  return {
    runtime: {
      mode: "local",
      workspaceRoot: input.workspaceRoot,
      resources: {
        globalRoot: input.globalRoot,
        workspaceConfigDirName: ".personal-agent",
        allowWorkspaceOverrides: true,
        files: {
          agents: "AGENTS.md",
          system: "SYSTEM.md",
          appendSystem: "APPEND_SYSTEM.md"
        },
        directories: {
          skills: "skills",
          prompts: "prompts",
          extensions: "extensions"
        }
      }
    },
    auth: {
      uiMode: "token",
      apiMode: "token",
      allowTailscaleUi: true
    },
    platforms: {
      telegram: {
        enabled: true,
        botTokenEnvVar: "TELEGRAM_BOT_TOKEN",
        allowedUsers: []
      }
    },
    sandbox: {
      dockerImage: "oven/bun:1.3.10-debian",
      dockerWorkspacePath: "/workspace"
    },
    scheduler: {
      tickIntervalMs: 60_000
    },
    state: {
      databasePath: ":memory:"
    }
  };
}

async function writeFileWithDirs(path: string, content: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content);
}
