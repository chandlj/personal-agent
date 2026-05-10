import type { AppConfig } from "@personal-agent/config";
import { type ResolvedRuntimeResources, resolveRuntimeResources } from "@personal-agent/config";
import { DefaultResourceLoader } from "./resource-loader.js";
import type {
  AgentRuntime,
  CreateAgentRuntimeInput,
  CreateRuntimeSessionInput,
  PromptRequest,
  PromptResult,
  RuntimeResourceLoader,
  RuntimeSession
} from "./types.js";

const DEFAULT_SESSION_KEY = "local";

interface RuntimeSessionFactory {
  createSession(input: {
    config: AppConfig;
    sessionKey: string;
    workspaceRoot: string;
    resources: ResolvedRuntimeResources;
    resourceLoader: RuntimeResourceLoader;
  }): Promise<RuntimeSession>;
}

class MissingRuntimeDriverError extends Error {
  constructor() {
    super("Agent runtime driver is not configured yet.");
    this.name = "MissingRuntimeDriverError";
  }
}

class UnconfiguredRuntimeSession implements RuntimeSession {
  readonly id = "unconfigured";
  readonly sessionKey: string;
  readonly workspaceRoot: string;

  constructor(input: { sessionKey: string; workspaceRoot: string }) {
    this.sessionKey = input.sessionKey;
    this.workspaceRoot = input.workspaceRoot;
  }

  async runPrompt(_request: PromptRequest): Promise<PromptResult> {
    throw new MissingRuntimeDriverError();
  }
}

class UnconfiguredRuntimeSessionFactory implements RuntimeSessionFactory {
  async createSession(input: {
    sessionKey: string;
    workspaceRoot: string;
  }): Promise<RuntimeSession> {
    return new UnconfiguredRuntimeSession(input);
  }
}

class DefaultAgentRuntime implements AgentRuntime {
  readonly config: AppConfig;
  readonly #sessionFactory: RuntimeSessionFactory;

  constructor(input: { config: AppConfig; sessionFactory: RuntimeSessionFactory }) {
    this.config = input.config;
    this.#sessionFactory = input.sessionFactory;
  }

  async createSession(input: CreateRuntimeSessionInput = {}): Promise<RuntimeSession> {
    const workspaceRoot = input.workspaceRoot ?? this.config.runtime.workspaceRoot;
    const resourceInput: Parameters<typeof resolveRuntimeResources>[0] = {
      config: this.config,
      workspaceRoot
    };

    if (input.includeWorkspaceResources !== undefined) {
      resourceInput.includeWorkspaceResources = input.includeWorkspaceResources;
    }

    if (input.resourcePaths !== undefined) {
      resourceInput.overrides = input.resourcePaths;
    }

    const resources = resolveRuntimeResources(resourceInput);
    const sessionInput: Parameters<RuntimeSessionFactory["createSession"]>[0] = {
      config: this.config,
      sessionKey: input.sessionKey ?? DEFAULT_SESSION_KEY,
      workspaceRoot,
      resources,
      resourceLoader: new DefaultResourceLoader({
        resources
      })
    };

    return this.#sessionFactory.createSession(sessionInput);
  }

  async runPrompt(request: PromptRequest): Promise<PromptResult> {
    const sessionInput: CreateRuntimeSessionInput = {};

    if (request.sessionKey !== undefined) {
      sessionInput.sessionKey = request.sessionKey;
    }

    if (request.includeWorkspaceResources !== undefined) {
      sessionInput.includeWorkspaceResources = request.includeWorkspaceResources;
    }

    if (request.workspaceRoot !== undefined) {
      sessionInput.workspaceRoot = request.workspaceRoot;
    }

    const session = await this.createSession(sessionInput);

    return session.runPrompt(request);
  }
}

export function createAgentRuntime(input: CreateAgentRuntimeInput): AgentRuntime {
  return new DefaultAgentRuntime({
    config: input.config,
    sessionFactory: new UnconfiguredRuntimeSessionFactory()
  });
}

export { MissingRuntimeDriverError };
