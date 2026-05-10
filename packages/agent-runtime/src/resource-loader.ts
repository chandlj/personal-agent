import { readdir, readFile, stat } from "node:fs/promises";
import { basename } from "node:path";
import type { ResolvedRuntimeResources, RuntimeResourceRoot } from "@personal-agent/config";
import type {
  LoadedRuntimeResource,
  LoadedRuntimeResourceDirectory,
  LoadedRuntimeResourceFile,
  LoadedRuntimeResources
} from "./types.js";

export class DefaultResourceLoader {
  readonly #resources: ResolvedRuntimeResources;

  constructor(input: { resources: ResolvedRuntimeResources }) {
    this.#resources = input.resources;
  }

  async load(): Promise<LoadedRuntimeResources> {
    const roots: LoadedRuntimeResource[] = [];

    for (const root of this.#resources.roots) {
      roots.push(await loadRoot(root));
    }

    return { roots };
  }
}

async function loadRoot(root: RuntimeResourceRoot): Promise<LoadedRuntimeResource> {
  const [agents, system, appendSystem, skills, prompts, extensions] = await Promise.all([
    loadFile({ kind: "agents", path: root.paths.agentFile }),
    loadFile({ kind: "system", path: root.paths.systemFile }),
    loadFile({ kind: "append_system", path: root.paths.appendSystemFile }),
    loadDirectory({ kind: "skills", path: root.paths.skillsDir }),
    loadDirectory({ kind: "prompts", path: root.paths.promptsDir }),
    loadDirectory({ kind: "extensions", path: root.paths.extensionsDir })
  ]);

  return {
    kind: root.kind,
    root: root.root,
    files: {
      agents,
      system,
      appendSystem
    },
    directories: {
      skills,
      prompts,
      extensions
    }
  };
}

async function loadFile(input: {
  kind: LoadedRuntimeResourceFile["kind"];
  path: string;
}): Promise<LoadedRuntimeResourceFile> {
  try {
    const fileStat = await stat(input.path);

    if (!fileStat.isFile()) {
      return {
        kind: input.kind,
        path: input.path,
        exists: false
      };
    }

    return {
      kind: input.kind,
      path: input.path,
      exists: true,
      content: await readFile(input.path, "utf8")
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        kind: input.kind,
        path: input.path,
        exists: false
      };
    }

    throw error;
  }
}

async function loadDirectory(input: {
  kind: LoadedRuntimeResourceDirectory["kind"];
  path: string;
}): Promise<LoadedRuntimeResourceDirectory> {
  try {
    const dirStat = await stat(input.path);

    if (!dirStat.isDirectory()) {
      return {
        kind: input.kind,
        path: input.path,
        exists: false,
        entries: []
      };
    }

    const dirents = await readdir(input.path, { withFileTypes: true });
    const entries = dirents
      .filter((entry) => entry.isFile() || entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: `${input.path}/${entry.name}`,
        type: entry.isDirectory() ? ("directory" as const) : ("file" as const)
      }))
      .sort((left, right) => left.name.localeCompare(right.name));

    return {
      kind: input.kind,
      path: input.path,
      exists: true,
      entries
    };
  } catch (error) {
    if (isMissingPathError(error)) {
      return {
        kind: input.kind,
        path: input.path,
        exists: false,
        entries: []
      };
    }

    throw error;
  }
}

function isMissingPathError(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

export function summarizeLoadedResources(resources: LoadedRuntimeResources): string[] {
  return resources.roots.flatMap((root) => {
    const label = `${root.kind}:${basename(root.root) || root.root}`;
    const files = Object.values(root.files)
      .filter((file) => file.exists)
      .map((file) => `${label}:${file.kind}`);
    const directories = Object.values(root.directories)
      .filter((directory) => directory.exists)
      .map((directory) => `${label}:${directory.kind}(${directory.entries.length})`);

    return [...files, ...directories];
  });
}
