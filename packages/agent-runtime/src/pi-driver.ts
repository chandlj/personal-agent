import { join } from "node:path";
import type {
  AgentSession as PiAgentSession,
  ResourceLoader as PiResourceLoader
} from "@earendil-works/pi-coding-agent";
import {
  AuthStorage,
  createAgentSession,
  ModelRegistry,
  DefaultResourceLoader as PiDefaultResourceLoader,
  SessionManager,
  SettingsManager
} from "@earendil-works/pi-coding-agent";
import { normalizePiEvent } from "./pi-events.js";
import type {
  LoadedRuntimeResource,
  LoadedRuntimeResourceDirectory,
  LoadedRuntimeResourceFile,
  LoadedRuntimeResources,
  PromptRequest,
  PromptResult,
  RuntimeSession,
  RuntimeSessionFactory,
  RuntimeSessionFactoryCreateSessionInput
} from "./types.js";

export class PiAgentRuntimeDriver implements RuntimeSessionFactory {
  async createSession(input: RuntimeSessionFactoryCreateSessionInput): Promise<RuntimeSession> {
    const loadedResources = await input.resourceLoader.load();
    const agentDir = input.config.runtime.resources.globalRoot;
    const authStorage = AuthStorage.create(join(agentDir, "auth.json"));
    const modelRegistry = ModelRegistry.create(authStorage, join(agentDir, "models.json"));
    const settingsManager = SettingsManager.inMemory();
    const sessionManager = SessionManager.inMemory(input.workspaceRoot);
    const resourceLoader = createPiResourceLoader({
      agentDir,
      cwd: input.workspaceRoot,
      loadedResources,
      settingsManager
    });

    await resourceLoader.reload();

    const { session } = await createAgentSession({
      cwd: input.workspaceRoot,
      agentDir,
      authStorage,
      modelRegistry,
      settingsManager,
      sessionManager,
      resourceLoader
    });

    return new PiRuntimeSession({
      session,
      sessionKey: input.sessionKey,
      workspaceRoot: input.workspaceRoot
    });
  }
}

class PiRuntimeSession implements RuntimeSession {
  readonly #session: PiAgentSession;

  readonly id: string;
  readonly sessionKey: string;
  readonly workspaceRoot: string;

  constructor(input: {
    session: PiAgentSession;
    sessionKey: string;
    workspaceRoot: string;
  }) {
    this.#session = input.session;
    this.id = input.session.sessionId;
    this.sessionKey = input.sessionKey;
    this.workspaceRoot = input.workspaceRoot;
  }

  async runPrompt(_request: PromptRequest): Promise<PromptResult> {
    const events: PromptResult["events"] = [];
    const textDeltas: string[] = [];
    let finalAssistantText: string | undefined;
    const unsubscribe = this.#session.subscribe((event) => {
      const normalized = normalizePiEvent(event);

      if (normalized === undefined) {
        return;
      }

      events.push(normalized.event);

      if (normalized.textDelta !== undefined) {
        textDeltas.push(normalized.textDelta);
      }

      if (normalized.finalAssistantText !== undefined) {
        finalAssistantText = normalized.finalAssistantText;
      }
    });

    try {
      await this.#session.prompt(_request.prompt, { source: "rpc" });
    } catch (error) {
      events.push({
        kind: "error",
        message: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
      throw error;
    } finally {
      unsubscribe();
    }

    return {
      sessionId: this.id,
      text: finalAssistantText ?? textDeltas.join(""),
      events,
      metadata: {
        provider: "pi"
      }
    };
  }

  dispose(): void {
    this.#session.dispose();
  }
}

function createPiResourceLoader(input: {
  agentDir: string;
  cwd: string;
  loadedResources: LoadedRuntimeResources;
  settingsManager: SettingsManager;
}): PiResourceLoader {
  const agentsFiles = input.loadedResources.roots.flatMap((root) =>
    existingFiles(root.files.agents).map((file) => ({
      path: file.path,
      content: file.content ?? ""
    }))
  );
  const systemPrompt = lastExistingFileContent(
    input.loadedResources.roots.map((root) => root.files.system)
  );
  const appendSystemPrompt = input.loadedResources.roots.flatMap((root) =>
    existingFiles(root.files.appendSystem).map((file) => file.content ?? "")
  );

  return new PiDefaultResourceLoader({
    cwd: input.cwd,
    agentDir: input.agentDir,
    settingsManager: input.settingsManager,
    additionalExtensionPaths: existingDirectories(input.loadedResources, "extensions"),
    additionalPromptTemplatePaths: existingDirectories(input.loadedResources, "prompts"),
    additionalSkillPaths: existingDirectories(input.loadedResources, "skills"),
    noContextFiles: true,
    noThemes: true,
    agentsFilesOverride: () => ({ agentsFiles }),
    systemPromptOverride: () => systemPrompt,
    appendSystemPromptOverride: () => appendSystemPrompt
  });
}

function existingFiles(file: LoadedRuntimeResourceFile): LoadedRuntimeResourceFile[] {
  return file.exists ? [file] : [];
}

function lastExistingFileContent(files: LoadedRuntimeResourceFile[]): string | undefined {
  return files.filter((file) => file.exists).at(-1)?.content;
}

function existingDirectories(
  resources: LoadedRuntimeResources,
  kind: keyof LoadedRuntimeResource["directories"]
): string[] {
  return resources.roots
    .map((root) => root.directories[kind])
    .filter((directory): directory is LoadedRuntimeResourceDirectory => directory.exists)
    .map((directory) => directory.path);
}
