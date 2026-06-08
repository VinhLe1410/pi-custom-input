import type { UsageSnapshot } from "../core/types";
import type { AuthResolver } from "../seams/auth";
import { createClaudeFetcher } from "./claude";
import { createCodexFetcher } from "./codex";
import { createCopilotFetcher } from "./copilot";
import { createGeminiFetcher } from "./gemini";
import { createKimiFetcher } from "./kimi";
import { createMinimaxFetcher } from "./minimax";

export interface UsageFetcher {
  fetch(): Promise<UsageSnapshot>;
}

export function createFetcherRegistry(auth: AuthResolver): Map<string, UsageFetcher> {
  return new Map<string, UsageFetcher>([
    ["claude", createClaudeFetcher(auth)],
    ["codex", createCodexFetcher(auth)],
    ["copilot", createCopilotFetcher(auth)],
    ["gemini", createGeminiFetcher(auth)],
    ["minimax", createMinimaxFetcher(auth, "minimax")],
    ["minimax-cn", createMinimaxFetcher(auth, "minimax-cn")],
    ["kimi-coding", createKimiFetcher(auth)],
  ]);
}
