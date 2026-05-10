import { join, resolve } from "node:path";
import type { AppConfig } from "@personal-agent/config";
import type {
  ResolvedRuntimeResources,
  RuntimeCallerSource,
  RuntimeResourcePaths,
  RuntimeResourceRoot
} from "./types.js";

export function resolveRuntimeResourcePaths(root: string, config: AppConfig): RuntimeResourcePaths {
  const resources = config.runtime.resources;

  return {
    agentFile: join(root, resources.files.agents),
    systemFile: join(root, resources.files.system),
    appendSystemFile: join(root, resources.files.appendSystem),
    skillsDir: join(root, resources.directories.skills),
    promptsDir: join(root, resources.directories.prompts),
    extensionsDir: join(root, resources.directories.extensions)
  };
}

export function resolveRuntimeResources(input: {
  config: AppConfig;
  source: RuntimeCallerSource;
  workspaceRoot: string;
  overrides?: Partial<RuntimeResourcePaths>;
}): ResolvedRuntimeResources {
  const globalRoot = resolve(input.config.runtime.resources.globalRoot);
  const roots: RuntimeResourceRoot[] = [
    {
      kind: "global",
      root: globalRoot,
      paths: {
        ...resolveRuntimeResourcePaths(globalRoot, input.config),
        ...input.overrides
      }
    }
  ];

  const workspaceOverrideRoot = resolve(
    input.workspaceRoot,
    input.config.runtime.resources.workspaceConfigDirName
  );

  if (shouldLoadWorkspaceOverrides(input)) {
    roots.push({
      kind: "workspace",
      root: workspaceOverrideRoot,
      paths: resolveRuntimeResourcePaths(workspaceOverrideRoot, input.config)
    });
  }

  return { roots };
}

function shouldLoadWorkspaceOverrides(input: {
  config: AppConfig;
  source: RuntimeCallerSource;
  workspaceRoot: string;
}): boolean {
  if (input.source !== "cli" || !input.config.runtime.resources.allowCliWorkspaceOverrides) {
    return false;
  }

  const workspaceRoot = resolve(input.workspaceRoot);
  const generatedRoot = resolve(input.config.runtime.workspaceRoot);

  return workspaceRoot !== generatedRoot && !workspaceRoot.startsWith(`${generatedRoot}/`);
}
