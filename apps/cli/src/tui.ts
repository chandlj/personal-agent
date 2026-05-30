import { resolve } from "node:path";
import type {
  CreateRuntimeSessionInput,
  RuntimeEvent,
  RuntimeSession
} from "@personal-agent/agent-runtime";
import { createAgentRuntime } from "@personal-agent/agent-runtime";
import { loadAppConfig } from "@personal-agent/config";
import {
  AssistantMessageComponent,
  DynamicBorder,
  getMarkdownTheme,
  getSelectListTheme,
  initTheme,
  ToolExecutionComponent,
  UserMessageComponent
} from "@earendil-works/pi-coding-agent";
import {
  Editor,
  Key,
  matchesKey,
  ProcessTerminal,
  Text,
  TruncatedText,
  TUI,
  truncateToWidth,
  type Component,
  type EditorTheme
} from "@earendil-works/pi-tui";

interface ChatStartOptions {
  cwd?: string;
  sessionKey?: string;
  tui?: boolean;
}

type ChatMessageRole = "system" | "user" | "assistant" | "tool" | "error";

interface ChatMessage {
  id: number;
  role: ChatMessageRole;
  text: string;
  component?: Component;
}

const style = {
  accent: color(81),
  border: color(60),
  error: color(203),
  muted: color(244),
  tool: color(221),
  user: color(216)
};

export async function runChatStartCommand(options: ChatStartOptions): Promise<void> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    console.error("error: TUI mode requires an interactive terminal");
    process.exitCode = 2;
    return;
  }

  await runChatTui(options);
}

async function runChatTui(options: ChatStartOptions): Promise<void> {
  const workspaceRoot = resolve(options.cwd ?? process.cwd());
  initTheme(undefined, false);

  const config = loadAppConfig();
  const runtime = createAgentRuntime({ config });
  const sessionInput: CreateRuntimeSessionInput = {
    includeWorkspaceResources: true,
    workspaceRoot
  };

  if (options.sessionKey !== undefined) {
    sessionInput.sessionKey = options.sessionKey;
  }

  const session = await runtime.createSession(sessionInput);

  const terminal = new ProcessTerminal();
  const ui = new TUI(terminal, true);
  const transcript = new TranscriptView();
  const input = new Editor(ui, getLocalEditorTheme(), { paddingX: 1 });
  const status = new Text(
    style.muted("Type a prompt. Enter sends, Shift+Enter adds a line, /exit quits."),
    1,
    0
  );
  const layout = new ChatLayout({
    editor: input,
    sessionId: session.id,
    status,
    transcript,
    workspaceRoot
  });
  let busy = false;
  let stopped = false;

  const stop = async (): Promise<void> => {
    if (stopped) {
      return;
    }

    stopped = true;
    ui.stop();
    session.dispose();
    await terminal.drainInput();
  };

  ui.addChild(layout);
  ui.setFocus(input);
  ui.addInputListener((data) => {
    if (matchesKey(data, Key.ctrl("c"))) {
      void stop();
      return { consume: true };
    }

    return undefined;
  });

  input.onSubmit = (submittedText) => {
    const prompt = submittedText.trim();

    if (busy || prompt.length === 0) {
      return;
    }

    input.setText("");

    if (prompt === "/exit" || prompt === "/quit") {
      void stop();
      return;
    }

    void sendPrompt({
      input,
      prompt,
      session,
      status,
      transcript,
      ui,
      workspaceRoot,
      setBusy: (nextBusy) => {
        busy = nextBusy;
      }
    });
  };

  transcript.add({
    role: "system",
    text: `TUI chat started.\nWorkspace: ${workspaceRoot}\nSession: ${session.id}`
  });
  ui.start();
}

async function sendPrompt(context: {
  input: Editor;
  prompt: string;
  session: RuntimeSession;
  status: Text;
  transcript: TranscriptView;
  ui: TUI;
  workspaceRoot: string;
  setBusy: (busy: boolean) => void;
}): Promise<void> {
  context.setBusy(true);
  context.input.disableSubmit = true;
  context.status.setText(style.accent("Thinking..."));
  context.transcript.add({
    role: "user",
    text: context.prompt,
    component: new UserMessageComponent(context.prompt, getMarkdownTheme())
  });
  const assistantComponent = new AssistantMessageComponent(
    assistantMessage(""),
    false,
    getMarkdownTheme()
  );
  const assistantMessageId = context.transcript.add({
    role: "assistant",
    text: "",
    component: assistantComponent
  });
  const toolComponents = new Map<string, ToolExecutionComponent>();
  context.ui.requestRender();

  try {
    const result = await context.session.runPrompt({
      prompt: context.prompt,
      includeWorkspaceResources: true,
      workspaceRoot: context.workspaceRoot,
      onEvent: (event) => {
        renderRuntimeEvent({
          assistantMessageId,
          event,
          status: context.status,
          transcript: context.transcript,
          toolComponents,
          workspaceRoot: context.workspaceRoot,
          ui: context.ui
        });
      }
    });

    if (result.text.trim().length > 0) {
      context.transcript.update(assistantMessageId, result.text);
    } else if (context.transcript.getText(assistantMessageId).trim().length === 0) {
      context.transcript.update(assistantMessageId, "(empty response)");
    }

    context.status.setText(style.muted("Ready."));
  } catch (error) {
    context.transcript.remove(assistantMessageId);
    context.transcript.add({
      role: "error",
      text: error instanceof Error ? error.message : String(error)
    });
    context.status.setText(style.error("Last prompt failed."));
  } finally {
    context.setBusy(false);
    context.input.disableSubmit = false;
    context.ui.requestRender(true);
  }
}

function renderRuntimeEvent(input: {
  assistantMessageId: number;
  event: RuntimeEvent;
  status: Text;
  transcript: TranscriptView;
  toolComponents: Map<string, ToolExecutionComponent>;
  workspaceRoot: string;
  ui: TUI;
}): void {
  switch (input.event.kind) {
    case "assistant_message":
      if (input.event.metadata?.assistantEventType === "text_delta") {
        input.transcript.append(input.assistantMessageId, input.event.text);
      } else {
        input.transcript.update(input.assistantMessageId, input.event.text);
      }
      break;
    case "message_end":
      if (input.event.role === "assistant" && input.event.text !== undefined) {
        input.transcript.update(input.assistantMessageId, input.event.text);
      }
      break;
    case "tool_start":
      startTool({
        event: input.event,
        toolComponents: input.toolComponents,
        transcript: input.transcript,
        workspaceRoot: input.workspaceRoot,
        ui: input.ui
      });
      input.status.setText(style.accent(`Running ${input.event.toolName}...`));
      break;
    case "tool_update": {
      updateTool({
        event: input.event,
        toolComponents: input.toolComponents
      });
      input.status.setText(style.accent(`Running ${input.event.toolName}...`));
      break;
    }
    case "tool_end":
      finishTool({
        event: input.event,
        toolComponents: input.toolComponents,
        transcript: input.transcript,
        workspaceRoot: input.workspaceRoot,
        ui: input.ui
      });
      input.status.setText(
        input.event.isError
          ? style.error(`${input.event.toolName} failed.`)
          : style.muted(`${input.event.toolName} finished.`)
      );
      break;
    case "retry_start":
      input.status.setText(style.accent(`Retrying after error, attempt ${input.event.attempt}...`));
      break;
    case "compaction_start":
      input.status.setText(style.accent("Compacting context..."));
      break;
    case "turn_start":
      input.status.setText(style.accent("Thinking..."));
      break;
  }

  input.ui.requestRender();
}

function startTool(input: {
  event: Extract<RuntimeEvent, { kind: "tool_start" }>;
  toolComponents: Map<string, ToolExecutionComponent>;
  transcript: TranscriptView;
  workspaceRoot: string;
  ui: TUI;
}): void {
  const component = new ToolExecutionComponent(
    input.event.toolName,
    input.event.toolCallId,
    input.event.args,
    { showImages: false },
    undefined,
    input.ui,
    input.workspaceRoot
  );
  component.markExecutionStarted();
  component.setArgsComplete();
  input.toolComponents.set(input.event.toolCallId, component);
  input.transcript.add({
    role: "tool",
    text: formatToolStart(input.event.toolName, input.event.args),
    component
  });
}

function updateTool(input: {
  event: Extract<RuntimeEvent, { kind: "tool_update" }>;
  toolComponents: Map<string, ToolExecutionComponent>;
}): void {
  const component = input.toolComponents.get(input.event.toolCallId);

  if (component !== undefined && input.event.partialResult !== undefined) {
    component.updateResult(toToolResult(input.event.partialResult, false), true);
  }
}

function finishTool(input: {
  event: Extract<RuntimeEvent, { kind: "tool_end" }>;
  toolComponents: Map<string, ToolExecutionComponent>;
  transcript: TranscriptView;
  workspaceRoot: string;
  ui: TUI;
}): void {
  const component = input.toolComponents.get(input.event.toolCallId);

  if (component !== undefined) {
    component.updateResult(toToolResult(input.event.result, input.event.isError), false);
    return;
  }

  startTool({
    event: {
      kind: "tool_start",
      toolCallId: input.event.toolCallId,
      toolName: input.event.toolName,
      timestamp: input.event.timestamp
    },
    toolComponents: input.toolComponents,
    transcript: input.transcript,
    workspaceRoot: input.workspaceRoot,
    ui: input.ui
  });
  input.toolComponents
    .get(input.event.toolCallId)
    ?.updateResult(toToolResult(input.event.result, input.event.isError), false);
}

function formatToolStart(toolName: string, args: unknown): string {
  const argsText = formatUnknown(args);

  if (argsText.length === 0) {
    return `${style.tool("Running")} \`${toolName}\`...`;
  }

  return `${style.tool("Running")} \`${toolName}\`...\n\n${argsText}`;
}

function formatUnknown(value: unknown): string {
  if (value === undefined) {
    return "";
  }

  if (typeof value === "string") {
    return truncate(value.trim());
  }

  return truncate(JSON.stringify(value, null, 2));
}

function truncate(text: string): string {
  const maxLength = 2_000;

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength)}\n...`;
}

class ChatLayout implements Component {
  private readonly footer = new TruncatedText(
    style.muted("  /exit quits  |  Ctrl+C exits  |  Shift+Enter inserts newline"),
    0,
    0
  );
  private readonly border = new DynamicBorder();

  constructor(
    private readonly input: {
      editor: Editor;
      sessionId: string;
      status: Text;
      transcript: TranscriptView;
      workspaceRoot: string;
    }
  ) {}

  invalidate(): void {
    this.input.transcript.invalidate();
    this.input.status.invalidate();
    this.input.editor.invalidate();
    this.footer.invalidate();
  }

  render(width: number): string[] {
    return [
      ...this.renderHeader(width),
      ...this.input.transcript.render(width),
      "",
      ...this.border.render(width),
      ...this.input.status.render(width),
      ...this.input.editor.render(width),
      ...this.footer.render(width)
    ];
  }

  private renderHeader(width: number): string[] {
    const title = style.accent(bold("personal-agent"));
    const workspace = style.muted(this.input.workspaceRoot);
    const session = style.muted(this.input.sessionId);

    return [
      truncateToWidth(`  ${title}  ${workspace}`, width),
      truncateToWidth(`  ${style.muted("session")} ${session}`, width),
      ...this.border.render(width),
      ""
    ];
  }
}

class TranscriptView implements Component {
  readonly #messages: ChatMessage[] = [];
  #nextMessageId = 1;

  add(message: Omit<ChatMessage, "id">): number {
    const id = this.#nextMessageId;
    this.#nextMessageId += 1;
    this.#messages.push({ ...message, id });
    return id;
  }

  getText(id: number): string {
    return this.#messages.find((message) => message.id === id)?.text ?? "";
  }

  update(id: number, text: string): void {
    const message = this.#messages.find((candidate) => candidate.id === id);

    if (message !== undefined) {
      message.text = text;
      updateComponentText(message, text);
    }
  }

  append(id: number, text: string): void {
    const message = this.#messages.find((candidate) => candidate.id === id);

    if (message !== undefined) {
      message.text += text;
      updateComponentText(message, message.text);
    }
  }

  remove(id: number): void {
    const index = this.#messages.findIndex((message) => message.id === id);

    if (index >= 0) {
      this.#messages.splice(index, 1);
    }
  }

  invalidate(): void {}

  render(width: number): string[] {
    const lines = this.#messages.flatMap((message) => renderMessage(message, width));
    return lines.length > 0 ? lines : ["personal-agent"];
  }
}

function renderMessage(message: ChatMessage, width: number): string[] {
  if (message.component !== undefined) {
    return message.component.render(width);
  }

  const label = formatRole(message.role);
  const rendered = new Text(message.text, 1, 0).render(Math.max(width - 2, 20));
  return [truncateToWidth(` ${label}`, width), ...rendered, ""];
}

function updateComponentText(message: ChatMessage, text: string): void {
  if (message.component instanceof AssistantMessageComponent) {
    message.component.updateContent(assistantMessage(text));
  }
}

function formatRole(role: ChatMessageRole): string {
  switch (role) {
    case "assistant":
      return style.accent("assistant");
    case "error":
      return style.error("error");
    case "system":
      return style.muted("system");
    case "tool":
      return style.tool("tool");
    case "user":
      return style.user("you");
  }
}

function getLocalEditorTheme(): EditorTheme {
  return {
    borderColor: style.border,
    selectList: getSelectListTheme()
  };
}

function assistantMessage(text: string): Parameters<AssistantMessageComponent["updateContent"]>[0] {
  return {
    role: "assistant",
    content: text.trim().length > 0 ? [{ type: "text", text }] : [],
    api: "personal-agent",
    provider: "personal-agent",
    model: "runtime",
    usage: {
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheWrite: 0,
      totalTokens: 0,
      cost: {
        input: 0,
        output: 0,
        cacheRead: 0,
        cacheWrite: 0,
        total: 0
      }
    },
    stopReason: "stop",
    timestamp: Date.now()
  };
}

function toToolResult(
  value: unknown,
  isError: boolean
): {
  content: Array<{ type: string; text?: string }>;
  isError: boolean;
} {
  const text = formatUnknown(value);

  return {
    content: text.length > 0 ? [{ type: "text", text }] : [],
    isError
  };
}

function color(code: number): (text: string) => string {
  return (text) => `\x1b[38;5;${code}m${text}\x1b[0m`;
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}
