import { resolve } from "node:path";
import { createAgentRuntime } from "@personal-agent/agent-runtime";
import { loadAppConfig } from "@personal-agent/config";
import { Command } from "commander";

interface PromptCommandOptions {
  cwd?: string;
  json?: boolean;
}

async function main(): Promise<void> {
  const program = new Command();

  configurePromptCommand(program.name("personal-agent"));

  const chat = program.command("chat").description("Agent chat commands");
  configurePromptCommand(chat.command("run").description("Run a one-shot prompt"));

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});

function configurePromptCommand(command: Command): Command {
  return command
    .argument("[prompt...]", "prompt text")
    .option("--cwd <path>", "workspace root", process.cwd())
    .option("--json", "print the normalized prompt result as JSON")
    .action(async (promptParts: string[], options: PromptCommandOptions) => {
      await runPromptCommand(promptParts, options);
    });
}

async function runPromptCommand(
  promptParts: string[],
  options: PromptCommandOptions
): Promise<void> {
  const prompt = promptParts.length > 0 ? promptParts.join(" ") : await readPromptFromStdin();

  if (prompt === undefined || prompt.trim().length === 0) {
    console.error("error: prompt is required");
    process.exitCode = 2;
    return;
  }

  const workspaceRoot = resolve(options.cwd ?? process.cwd());
  const config = loadAppConfig();
  const runtime = createAgentRuntime({ config });
  const result = await runtime.runPrompt({
    prompt,
    includeWorkspaceResources: true,
    workspaceRoot
  });

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.text);
}

async function readPromptFromStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  const text = await Bun.stdin.text();
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
