import { createHash } from "node:crypto";
import { posix, relative, resolve } from "node:path";
import { BunCommandRunner, commandRunnerOptions } from "./command-runner.js";
import { errorMessage, executionResult } from "./results.js";
import type {
  CommandRunner,
  CommandExecutor,
  DockerBindMount,
  DockerExecutorOptions,
  DockerBackendConfig,
  ExecutionRequest,
  ExecutionResult
} from "./types.js";

const BLOCKED_BIND_SOURCES = ["/", "/etc", "/proc", "/sys", "/dev"];
const OWNER_LABEL = "personal-agent.owner=personal-agent";

type NormalizedDockerBackendConfig = DockerBackendConfig & {
  containerName: string;
};

export function createDockerExecutor(options: DockerExecutorOptions): CommandExecutor {
  const config = normalizeDockerConfig(options.config);
  validateNormalizedDockerConfig(config);

  return new DockerExecutor(config, options.runner ?? new BunCommandRunner());
}

export function validateDockerConfig(config: DockerBackendConfig): void {
  validateNormalizedDockerConfig(normalizeDockerConfig(config));
}

function validateNormalizedDockerConfig(config: NormalizedDockerBackendConfig): void {
  if (config.privileged === true) {
    throw new Error("Docker backend cannot run privileged containers");
  }

  if (config.networkMode === "host") {
    throw new Error("Docker backend cannot use host networking");
  }

  for (const securityOpt of config.securityOpt ?? []) {
    if (securityOpt === "seccomp=unconfined" || securityOpt === "apparmor=unconfined") {
      throw new Error(`Docker backend cannot use unconfined security option: ${securityOpt}`);
    }
  }

  for (const bind of config.binds ?? []) {
    validateBindMount(bind, config.workspacePath);
  }
}

class DockerExecutor implements CommandExecutor {
  readonly backend = "docker";
  readonly #config: NormalizedDockerBackendConfig;
  readonly #runner: CommandRunner;
  #containerReady = false;

  constructor(config: NormalizedDockerBackendConfig, runner: CommandRunner) {
    this.#config = config;
    this.#runner = runner;
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startedAtMs = Date.now();
    const startedAt = new Date(startedAtMs).toISOString();

    try {
      await this.#ensureContainer();
      const runResult = await this.#runner.run(
        "docker",
        execArgs(request, this.#config),
        commandRunnerOptions({
          signal: request.signal,
          timeoutMs: request.timeoutMs ?? this.#config.timeoutMs
        })
      );

      return executionResult({
        request,
        startedAtMs,
        startedAt,
        backend: "docker",
        stdout: runResult.stdout,
        stderr: runResult.stderr,
        exitCode: runResult.exitCode,
        timedOut: runResult.timedOut === true,
        cancelled: runResult.cancelled === true,
        containerName: this.#config.containerName
      });
    } catch (error) {
      const message = errorMessage(error);
      return executionResult({
        request,
        startedAtMs,
        startedAt,
        backend: "docker",
        stdout: "",
        stderr: message,
        exitCode: 1,
        timedOut: false,
        cancelled: false,
        error: message,
        containerName: this.#config.containerName
      });
    }
  }

  async #ensureContainer(): Promise<void> {
    if (this.#containerReady) {
      return;
    }

    const inspectResult = await this.#runner.run("docker", inspectArgs(this.#config.containerName));

    if (inspectResult.exitCode === 0 && inspectResult.stdout.trim() === "true") {
      this.#containerReady = true;
      return;
    }

    if (inspectResult.exitCode === 0) {
      await this.#mustRunDocker(["start", this.#config.containerName]);
      this.#containerReady = true;
      return;
    }

    await this.#mustRunDocker(runArgs(this.#config));
    this.#containerReady = true;
  }

  async #mustRunDocker(args: string[]): Promise<void> {
    const result = await this.#runner.run("docker", args);

    if (result.exitCode !== 0) {
      throw new Error(result.stderr || `docker ${args.join(" ")} failed`);
    }
  }
}

function normalizeDockerConfig(config: DockerBackendConfig): NormalizedDockerBackendConfig {
  return {
    ...config,
    workspaceRoot: resolve(config.workspaceRoot),
    containerName: config.containerName ?? defaultContainerName(config.workspaceRoot)
  };
}

function validateBindMount(bind: DockerBindMount, workspacePath: string): void {
  const source = resolve(bind.source);

  if (BLOCKED_BIND_SOURCES.some((blockedSource) => isPathAtOrInside(source, blockedSource))) {
    throw new Error(`Docker backend cannot bind dangerous host path: ${source}`);
  }

  if (source === "/var/run/docker.sock" || source.endsWith("/docker.sock")) {
    throw new Error("Docker backend cannot bind the Docker socket");
  }

  if (bind.target === workspacePath) {
    throw new Error(`Docker backend bind target is reserved: ${workspacePath}`);
  }
}

function inspectArgs(containerName: string): string[] {
  return ["container", "inspect", "-f", "{{.State.Running}}", containerName];
}

function runArgs(config: NormalizedDockerBackendConfig): string[] {
  const args = [
    "run",
    "-d",
    "--name",
    config.containerName,
    ...labelArgs(dockerLabels(config)),
    "--workdir",
    config.workspacePath,
    "--mount",
    mountArg({
      source: config.workspaceRoot,
      target: config.workspacePath
    }),
    "--cap-drop",
    "ALL",
    "--security-opt",
    "no-new-privileges",
    "--pids-limit",
    "256",
    "--tmpfs",
    "/tmp:rw,nosuid,nodev,size=64m"
  ];

  for (const bind of config.binds ?? []) {
    args.push("--mount", mountArg(bind));
  }

  for (const cap of config.capAdd ?? []) {
    args.push("--cap-add", cap);
  }

  for (const securityOpt of config.securityOpt ?? []) {
    args.push("--security-opt", securityOpt);
  }

  if (config.networkMode !== undefined) {
    args.push("--network", config.networkMode);
  }

  args.push(config.image, "sleep", "infinity");
  return args;
}

function execArgs(request: ExecutionRequest, config: NormalizedDockerBackendConfig): string[] {
  return [
    "exec",
    "-w",
    containerCwd(request.cwd, config.workspaceRoot, config.workspacePath),
    ...envArgs(request.env, config.envAllowlist ?? []),
    config.containerName,
    "sh",
    "-lc",
    request.command
  ];
}

function defaultContainerName(workspaceRoot: string): string {
  return `personal-agent-${workspaceRootDigest(workspaceRoot)}`;
}

function workspaceRootDigest(workspaceRoot: string): string {
  return createHash("sha256").update(resolve(workspaceRoot)).digest("hex").slice(0, 16);
}

function dockerLabels(config: NormalizedDockerBackendConfig): string[] {
  const labels = [
    OWNER_LABEL,
    `personal-agent.workspace-root-hash=${workspaceRootDigest(config.workspaceRoot)}`
  ];

  if (config.workspaceId !== undefined) {
    labels.push(`personal-agent.workspace-id=${config.workspaceId}`);
  }

  if (config.workspaceKey !== undefined) {
    labels.push(`personal-agent.workspace-key=${config.workspaceKey}`);
  }

  return labels;
}

function labelArgs(labels: string[]): string[] {
  return labels.flatMap((label) => ["--label", label]);
}

function mountArg(bind: DockerBindMount): string {
  const readonly = bind.readonly === true ? ",readonly" : "";
  return `type=bind,source=${resolve(bind.source)},target=${bind.target}${readonly}`;
}

function envArgs(env: Record<string, string> | undefined, allowlist: string[]): string[] {
  if (env === undefined) {
    return [];
  }

  const args: string[] = [];
  const allowed = new Set(allowlist);

  for (const [name, value] of Object.entries(env).sort(([left], [right]) =>
    left.localeCompare(right)
  )) {
    if (allowed.has(name)) {
      args.push("--env", `${name}=${value}`);
    }
  }

  return args;
}

function containerCwd(
  cwd: string | undefined,
  workspaceRoot: string,
  workspacePath: string
): string {
  const normalizedWorkspacePath = normalizeContainerPath(workspacePath);

  if (cwd === undefined) {
    return normalizedWorkspacePath;
  }

  if (cwd.startsWith(normalizedWorkspacePath)) {
    return clampContainerPath(cwd, normalizedWorkspacePath);
  }

  if (!posix.isAbsolute(cwd)) {
    return clampContainerPath(posix.join(normalizedWorkspacePath, cwd), normalizedWorkspacePath);
  }

  const relativePath = relative(workspaceRoot, resolve(cwd));

  if (relativePath === ".." || relativePath.startsWith("../")) {
    return normalizedWorkspacePath;
  }

  return relativePath === ""
    ? normalizedWorkspacePath
    : clampContainerPath(
        posix.join(normalizedWorkspacePath, relativePath),
        normalizedWorkspacePath
      );
}

function isPathAtOrInside(path: string, boundary: string): boolean {
  return path === boundary || path.startsWith(`${boundary}/`);
}

function normalizeContainerPath(path: string): string {
  const normalized = posix.normalize(path);
  return normalized === "." ? "/" : normalized;
}

function clampContainerPath(path: string, workspacePath: string): string {
  const normalized = normalizeContainerPath(path);

  if (!isPathAtOrInside(normalized, workspacePath)) {
    return workspacePath;
  }

  return normalized;
}
