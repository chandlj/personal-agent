import type { CommandResult, CommandRunner, CommandRunnerOptions } from "./types.js";

export class BunCommandRunner implements CommandRunner {
  async run(
    command: string,
    args: string[],
    options: CommandRunnerOptions = {}
  ): Promise<CommandResult> {
    const spawnOptions: Bun.SpawnOptions.OptionsObject<"ignore", "pipe", "pipe"> = {
      stdout: "pipe",
      stderr: "pipe"
    };

    if (options.cwd !== undefined) {
      spawnOptions.cwd = options.cwd;
    }

    if (options.env !== undefined) {
      spawnOptions.env = options.env;
    }

    const proc = Bun.spawn([command, ...args], spawnOptions);

    let timedOut = false;
    const onAbort = () => {
      proc.kill();
    };
    const timeout =
      options.timeoutMs === undefined
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            proc.kill();
          }, options.timeoutMs);

    try {
      if (options.signal !== undefined) {
        if (options.signal.aborted) {
          onAbort();
        } else {
          options.signal.addEventListener("abort", onAbort, { once: true });
        }
      }

      const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited
      ]);

      return {
        stdout,
        stderr,
        exitCode,
        timedOut,
        cancelled: timedOut
      };
    } finally {
      options.signal?.removeEventListener("abort", onAbort);

      if (timeout !== undefined) {
        clearTimeout(timeout);
      }
    }
  }
}

export function commandRunnerOptions(
  input: CommandRunnerOptions
): CommandRunnerOptions | undefined {
  const options: CommandRunnerOptions = {};

  if (input.cwd !== undefined) {
    options.cwd = input.cwd;
  }

  if (input.env !== undefined) {
    options.env = input.env;
  }

  if (input.signal !== undefined) {
    options.signal = input.signal;
  }

  if (input.timeoutMs !== undefined) {
    options.timeoutMs = input.timeoutMs;
  }

  return Object.keys(options).length === 0 ? undefined : options;
}
