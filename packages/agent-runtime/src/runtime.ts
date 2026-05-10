import type { AppConfig } from "@personal-agent/config";
import { resolveRuntimeResources } from "@personal-agent/config";
import { PiAgentRuntimeDriver } from "./pi-driver.js";
import { DefaultResourceLoader } from "./resource-loader.js";
import type {
  AgentRuntime,
  CreateAgentRuntimeInput,
  CreateRuntimeSessionInput,
  PromptRequest,
  PromptResult,
  RuntimeSession,
  RuntimeSessionFactory,
  RuntimeSessionFactoryCreateSessionInput
} from "./types.js";

const DEFAULT_SESSION_KEY = "local";

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
    const sessionInput: RuntimeSessionFactoryCreateSessionInput = {
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
    sessionFactory: new PiAgentRuntimeDriver()
  });
}
