import type { UsageProviderKey } from "../core/providers";
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

type FetcherFactory = (auth: AuthResolver) => UsageFetcher;

const FETCHER_FACTORIES: Record<UsageProviderKey, FetcherFactory> = {
  claude: createClaudeFetcher,
  codex: createCodexFetcher,
  copilot: createCopilotFetcher,
  gemini: createGeminiFetcher,
  minimax: (auth) => createMinimaxFetcher(auth, "minimax"),
  "minimax-cn": (auth) => createMinimaxFetcher(auth, "minimax-cn"),
  "kimi-coding": createKimiFetcher,
};

export function createFetcherRegistry(
  auth: AuthResolver,
): Map<UsageProviderKey, UsageFetcher> {
  return new Map(
    Object.entries(FETCHER_FACTORIES).map(([providerKey, createFetcher]) => [
      providerKey as UsageProviderKey,
      createFetcher(auth),
    ]),
  );
}
