import { join, resolve } from "node:path";
import type { AppConfig } from "./schema.js";

export interface RuntimeResourcePaths {
  agentFile: string;
  systemFile: string;
  appendSystemFile: string;
  skillsDir: string;
  promptsDir: string;
  extensionsDir: string;
}

export type RuntimeResourceRootKind = "global" | "workspace";

export interface RuntimeResourceRoot {
  kind: RuntimeResourceRootKind;
  root: string;
  paths: RuntimeResourcePaths;
}

export interface ResolvedRuntimeResources {
  roots: RuntimeResourceRoot[];
}

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
  workspaceRoot: string;
  includeWorkspaceResources?: boolean;
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
  workspaceRoot: string;
  includeWorkspaceResources?: boolean;
}): boolean {
  if (
    !(input.includeWorkspaceResources ?? input.config.runtime.resources.allowWorkspaceOverrides)
  ) {
    return false;
  }

  const workspaceRoot = resolve(input.workspaceRoot);
  const generatedRoot = resolve(input.config.runtime.workspaceRoot);

  return workspaceRoot !== generatedRoot && !workspaceRoot.startsWith(`${generatedRoot}/`);
}
