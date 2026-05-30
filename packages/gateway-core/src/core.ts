import type { UiAuthPolicy } from "@personal-agent/auth";
import type { AppConfig } from "@personal-agent/config";
import type { AgentRuntime, PromptResult } from "@personal-agent/agent-runtime";
import {
  type SessionEntryRepository,
  type SessionRepository,
  type SessionStoreDatabase,
  type WorkspaceRepository,
  createSessionEntryRepository,
  createSessionRepository,
  createWorkspaceRepository
} from "@personal-agent/session-store";
import { createId } from "@personal-agent/shared";
import type {
  GatewayHandleResult,
  GatewayHandledInboundEvent,
  GatewayHandledPlatform,
  GatewayInboundEvent,
  GatewayOutboundMessage,
  GatewayPlatform,
  GatewayRoute,
  GatewayRouteScope
} from "./types.js";

export interface GatewayCore {
  kind: "gateway-core";
  config: AppConfig;
  auth: UiAuthPolicy;
  routeEvent(event: GatewayInboundEvent): GatewayRoute;
  handleInboundEvent(event: GatewayHandledInboundEvent): Promise<GatewayHandleResult>;
}

export interface GatewayDelivery {
  deliver(message: GatewayOutboundMessage): Promise<void>;
}

export interface CreateGatewayCoreInput {
  config: AppConfig;
  auth: UiAuthPolicy;
  runtime?: AgentRuntime;
  delivery?: GatewayDelivery;
  store?: SessionStoreDatabase;
  repositories?: GatewayRepositories;
  agentId?: string;
  runtimeProvider?: string;
  idFactory?: (prefix: string) => string;
  now?: () => string;
}

export interface GatewayRepositories {
  workspaces: WorkspaceRepository;
  sessions: SessionRepository;
  sessionEntries: SessionEntryRepository;
}

export interface BuildGatewayRouteKeyInput {
  agentId: string;
  platform: GatewayPlatform;
  scope: GatewayRouteScope;
  chatId: string;
  threadId?: string;
}

const DEFAULT_AGENT_ID = "main";
const DEFAULT_RUNTIME_PROVIDER = "pi";

export function createGatewayCore(input: CreateGatewayCoreInput): GatewayCore {
  const agentId = input.agentId ?? DEFAULT_AGENT_ID;
  const runtimeProvider = input.runtimeProvider ?? DEFAULT_RUNTIME_PROVIDER;
  const idFactory = input.idFactory ?? createId;
  const now = input.now ?? (() => new Date().toISOString());
  const repositories =
    input.repositories ??
    (input.store === undefined
      ? undefined
      : {
          workspaces: createWorkspaceRepository(input.store, {
            idFactory: () => idFactory("workspace"),
            now,
            workspaceRoot: input.config.runtime.workspaceRoot
          }),
          sessions: createSessionRepository(input.store, { now }),
          sessionEntries: createSessionEntryRepository(input.store, { now })
        });
  const queue = new SessionQueue<GatewayHandleResult>();

  return {
    kind: "gateway-core",
    config: input.config,
    auth: input.auth,
    routeEvent(event) {
      return resolveGatewayRoute(event, { agentId });
    },
    handleInboundEvent(event) {
      assertHandledPlatform(event.platform);
      const route = resolveGatewayRoute(event, { agentId });

      return queue.enqueue(route.sessionKey, () =>
        handleInboundEvent({
          event,
          route,
          runtime: requireRuntime(input.runtime),
          delivery: requireDelivery(input.delivery),
          repositories: requireRepositories(repositories),
          runtimeProvider,
          idFactory,
          now
        })
      );
    }
  };
}

export function resolveGatewayRoute(
  event: GatewayInboundEvent,
  input: { agentId?: string } = {}
): GatewayRoute {
  const agentId = input.agentId ?? DEFAULT_AGENT_ID;
  const scope = event.scope ?? inferGatewayRouteScope(event);
  const routeInput: BuildGatewayRouteKeyInput = {
    agentId,
    platform: event.platform,
    scope,
    chatId: event.chatId
  };

  if (event.threadId !== undefined) {
    routeInput.threadId = event.threadId;
  }

  return {
    ...routeInput,
    sessionKey: buildGatewayRouteKey(routeInput)
  };
}

export function buildGatewayRouteKey(input: BuildGatewayRouteKeyInput): string {
  if (input.scope === "thread") {
    if (input.threadId === undefined || input.threadId.length === 0) {
      throw new Error("Gateway thread routes require threadId");
    }

    return `agent:${input.agentId}:${input.platform}:thread:${input.chatId}:${input.threadId}`;
  }

  return `agent:${input.agentId}:${input.platform}:${input.scope}:${input.chatId}`;
}

export function inferGatewayRouteScope(event: GatewayInboundEvent): GatewayRouteScope {
  if (event.threadId !== undefined && event.threadId.length > 0) {
    return "thread";
  }

  if (event.platform === "telegram") {
    return event.chatId.startsWith("-") ? "group" : "dm";
  }

  return "channel";
}

interface HandleInboundEventInput {
  event: GatewayHandledInboundEvent;
  route: GatewayRoute;
  runtime: AgentRuntime;
  delivery: GatewayDelivery;
  repositories: GatewayRepositories;
  runtimeProvider: string;
  idFactory: (prefix: string) => string;
  now: () => string;
}

async function handleInboundEvent(input: HandleInboundEventInput): Promise<GatewayHandleResult> {
  const workspaceInput = {
    source: gatewayPlatformToWorkspaceSource(input.event.platform),
    platform: input.event.platform,
    scope: input.route.scope,
    chatId: input.event.chatId,
    agentId: input.route.agentId
  };

  const workspace = await input.repositories.workspaces.resolveOrCreate(
    input.event.threadId === undefined
      ? workspaceInput
      : {
          ...workspaceInput,
          threadId: input.event.threadId
        }
  );
  const session = await resolveOrCreateActiveSession(input, workspace.id);
  const parentEntryId = session.activeLeafEntryId;
  const userEntryId = input.idFactory("session-entry");
  const assistantEntryId = input.idFactory("session-entry");
  const userText = input.event.text ?? "";

  await input.repositories.sessionEntries.append({
    id: userEntryId,
    sessionId: session.id,
    parentEntryId,
    runtimeEntryId: null,
    entryType: "message",
    role: "user",
    messageType:
      input.event.attachments.length > 0 && userText.length === 0 ? "attachment" : "text",
    text: userText.length > 0 ? userText : null,
    payloadJson: {
      platform: input.event.platform,
      chatId: input.event.chatId,
      userId: input.event.userId,
      threadId: input.event.threadId ?? null,
      messageId: input.event.messageId,
      attachments: input.event.attachments
    },
    runtimePayloadJson: null,
    createdAt: input.event.timestamp
  });
  await input.repositories.sessionEntries.moveActiveLeaf(session.id, userEntryId);

  const promptResult = await input.runtime.runPrompt({
    prompt: formatPrompt(input.event),
    sessionKey: input.route.sessionKey,
    workspaceRoot: workspace.rootPath,
    metadata: {
      gateway: {
        platform: input.event.platform,
        chatId: input.event.chatId,
        threadId: input.event.threadId ?? null,
        messageId: input.event.messageId,
        userEntryId
      }
    }
  });

  await input.repositories.sessionEntries.append({
    id: assistantEntryId,
    sessionId: session.id,
    parentEntryId: userEntryId,
    runtimeEntryId: runtimeEntryId(promptResult),
    entryType: "message",
    role: "assistant",
    messageType: "text",
    text: promptResult.text,
    payloadJson: null,
    runtimePayloadJson: {
      runtimeSessionId: promptResult.sessionId,
      metadata: promptResult.metadata ?? null
    },
    createdAt: input.now()
  });

  const outbound: GatewayOutboundMessage = {
    platform: input.event.platform,
    targetChatId: input.event.chatId,
    text: promptResult.text,
    replyToMessageId: input.event.messageId,
    deliveryMode: "final"
  };

  if (input.event.threadId !== undefined) {
    outbound.targetThreadId = input.event.threadId;
  }

  try {
    await input.delivery.deliver(outbound);
  } catch (error) {
    await appendDeliveryFailureEntry(input, {
      sessionId: session.id,
      parentEntryId: userEntryId,
      assistantEntryId,
      error
    });
    throw error;
  }

  await input.repositories.sessionEntries.moveActiveLeaf(session.id, assistantEntryId);

  return {
    route: input.route,
    workspaceId: workspace.id,
    sessionId: session.id,
    userEntryId,
    assistantEntryId,
    outbound
  };
}

async function appendDeliveryFailureEntry(
  input: HandleInboundEventInput,
  failure: {
    sessionId: string;
    parentEntryId: string;
    assistantEntryId: string;
    error: unknown;
  }
): Promise<void> {
  await input.repositories.sessionEntries.append({
    id: input.idFactory("session-entry"),
    sessionId: failure.sessionId,
    parentEntryId: failure.parentEntryId,
    runtimeEntryId: null,
    entryType: "state_change",
    role: null,
    messageType: "status",
    text: "Gateway delivery failed",
    payloadJson: {
      assistantEntryId: failure.assistantEntryId,
      errorMessage: errorMessage(failure.error)
    },
    runtimePayloadJson: null,
    createdAt: input.now()
  });
}

async function resolveOrCreateActiveSession(
  input: HandleInboundEventInput,
  workspaceId: string
): Promise<Awaited<ReturnType<SessionRepository["getActiveBySessionKey"]>> & {}> {
  const existing = await input.repositories.sessions.getActiveBySessionKey(input.route.sessionKey);

  if (existing !== null) {
    return existing;
  }

  const timestamp = input.now();
  const session = {
    id: input.idFactory("session"),
    workspaceId,
    sessionKey: input.route.sessionKey,
    parentSessionId: null,
    runtimeProvider: input.runtimeProvider,
    runtimeSessionId: null,
    runtimeSessionPath: null,
    activeLeafEntryId: null,
    source: gatewayPlatformToWorkspaceSource(input.event.platform),
    title: null,
    status: "active" as const,
    createdAt: timestamp,
    updatedAt: timestamp,
    lastMessageAt: null
  };

  await input.repositories.sessions.create(session);

  return session;
}

function formatPrompt(event: GatewayInboundEvent): string {
  if (event.text !== undefined && event.text.length > 0) {
    return event.text;
  }

  if (event.attachments.length > 0) {
    return event.attachments.map((attachment) => `Attachment: ${attachment.localPath}`).join("\n");
  }

  return "";
}

function runtimeEntryId(result: PromptResult): string | null {
  const value = result.metadata?.entryId;

  return typeof value === "string" ? value : null;
}

function gatewayPlatformToWorkspaceSource(platform: GatewayHandledPlatform): "telegram" {
  return platform;
}

function assertHandledPlatform(
  platform: GatewayPlatform
): asserts platform is GatewayHandledPlatform {
  if (platform !== "telegram") {
    throw new Error(`Gateway handling is not implemented for ${platform}`);
  }
}

function requireRuntime(runtime: AgentRuntime | undefined): AgentRuntime {
  if (runtime === undefined) {
    throw new Error("GatewayCore.handleInboundEvent requires a runtime dependency");
  }

  return runtime;
}

function requireDelivery(delivery: GatewayDelivery | undefined): GatewayDelivery {
  if (delivery === undefined) {
    throw new Error("GatewayCore.handleInboundEvent requires a delivery dependency");
  }

  return delivery;
}

function requireRepositories(repositories: GatewayRepositories | undefined): GatewayRepositories {
  if (repositories === undefined) {
    throw new Error("GatewayCore.handleInboundEvent requires session-store dependencies");
  }

  return repositories;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class SessionQueue<T> {
  readonly #tails = new Map<string, Promise<void>>();

  enqueue(key: string, work: () => Promise<T>): Promise<T> {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    const run = previous.then(work, work);
    const tail = run.then(
      () => undefined,
      () => undefined
    );

    this.#tails.set(key, tail);
    tail.then(() => {
      if (this.#tails.get(key) === tail) {
        this.#tails.delete(key);
      }
    });

    return run;
  }
}
