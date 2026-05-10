import type { AppConfig } from "@personal-agent/config";

export interface Scheduler {
  tickIntervalMs: number;
}

export function createScheduler(input: { config: AppConfig }): Scheduler {
  return {
    tickIntervalMs: input.config.scheduler.tickIntervalMs
  };
}
