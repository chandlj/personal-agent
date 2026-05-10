import { resolve } from "node:path";
import { createAgentRuntime } from "@personal-agent/agent-runtime";
import { loadAppConfig } from "@personal-agent/config";

interface CliCommand {
  help: boolean;
  json: boolean;
  prompt?: string;
  workspaceRoot: string;
}

async function main(): Promise<void> {
  const command = await parseCommand(process.argv.slice(2));

  if (command.help) {
    printUsage();
    return;
  }

  if (command.prompt === undefined || command.prompt.trim().length === 0) {
    printUsage();
    process.exitCode = 2;
    return;
  }

  const config = loadAppConfig();
  const runtime = createAgentRuntime({ config });
  const result = await runtime.runPrompt({
    prompt: command.prompt,
    includeWorkspaceResources: true,
    workspaceRoot: command.workspaceRoot
  });

  if (command.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(result.text);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error(message);
  process.exitCode = 1;
});

async function parseCommand(args: string[]): Promise<CliCommand> {
  const commandArgs = args[0] === "chat" && args[1] === "run" ? args.slice(2) : args;
  let help = false;
  let json = false;
  let workspaceRoot = process.cwd();
  const promptParts: string[] = [];

  for (let index = 0; index < commandArgs.length; index += 1) {
    const arg = commandArgs[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      help = true;
      continue;
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--cwd") {
      const cwd = commandArgs[index + 1];

      if (cwd === undefined) {
        throw new Error("--cwd requires a path.");
      }

      workspaceRoot = resolve(cwd);
      index += 1;
      continue;
    }

    promptParts.push(arg);
  }

  const prompt = promptParts.length > 0 ? promptParts.join(" ") : await readPromptFromStdin();

  const command: CliCommand = {
    help,
    json,
    workspaceRoot
  };

  if (prompt !== undefined) {
    command.prompt = prompt;
  }

  return command;
}

async function readPromptFromStdin(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  const text = await Bun.stdin.text();
  const trimmed = text.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function printUsage(): void {
  console.log(`Usage:
  personal-agent chat run [--cwd <path>] [--json] <prompt>
  personal-agent [--cwd <path>] [--json] <prompt>
  echo "<prompt>" | personal-agent chat run [--cwd <path>]`);
}
