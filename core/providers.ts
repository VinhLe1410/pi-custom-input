interface ProviderFooterPolicy {
  includeWindowLabels?: readonly string[];
}

interface UsageProviderDescriptor {
  displayName: string;
  piProviderKeys: readonly string[];
  authKey: string;
  envVar?: string;
  accountId?: boolean;
  footer?: ProviderFooterPolicy;
}

export const USAGE_PROVIDERS = {
  claude: {
    displayName: "Claude",
    piProviderKeys: ["anthropic"],
    authKey: "anthropic",
  },
  codex: {
    displayName: "Codex",
    piProviderKeys: ["openai-codex"],
    authKey: "openai-codex",
    accountId: true,
  },
  copilot: {
    displayName: "Copilot",
    piProviderKeys: ["github-copilot"],
    authKey: "github-copilot",
    footer: {
      includeWindowLabels: ["Premium"],
    },
  },
  gemini: {
    displayName: "Gemini",
    piProviderKeys: ["google-gemini-cli"],
    authKey: "google-gemini-cli",
  },
  minimax: {
    displayName: "MiniMax",
    piProviderKeys: ["minimax"],
    authKey: "minimax",
    envVar: "MINIMAX_API_KEY",
  },
  "minimax-cn": {
    displayName: "MiniMax CN",
    piProviderKeys: ["minimax-cn"],
    authKey: "minimax-cn",
    envVar: "MINIMAX_CN_API_KEY",
  },
  "kimi-coding": {
    displayName: "Kimi Coding",
    piProviderKeys: ["kimi-coding"],
    authKey: "kimi-coding",
    envVar: "KIMI_API_KEY",
  },
} as const satisfies Record<string, UsageProviderDescriptor>;

export type UsageProviderKey = keyof typeof USAGE_PROVIDERS;
export type ProviderAuthKey = (typeof USAGE_PROVIDERS)[UsageProviderKey]["authKey"];
export type PiProviderKey = (typeof USAGE_PROVIDERS)[UsageProviderKey]["piProviderKeys"][number];
export type AccountIdProviderKey = {
  [K in UsageProviderKey]: (typeof USAGE_PROVIDERS)[K] extends { accountId: true }
    ? K
    : never;
}[UsageProviderKey];
export type { ProviderFooterPolicy };

export const PROVIDER_MAP = Object.fromEntries(
  Object.entries(USAGE_PROVIDERS).flatMap(([providerKey, provider]) =>
    provider.piProviderKeys.map((piProviderKey) => [
      piProviderKey,
      providerKey as UsageProviderKey,
    ]),
  ),
) as Record<string, UsageProviderKey>;

export function usageProviderForPiProvider(
  piProviderKey: string | undefined,
): UsageProviderKey | null {
  return piProviderKey ? PROVIDER_MAP[piProviderKey] ?? null : null;
}

export function providerDisplayName(providerKey: UsageProviderKey): string {
  return USAGE_PROVIDERS[providerKey].displayName;
}

export function providerAuthKey(providerKey: UsageProviderKey): ProviderAuthKey {
  return USAGE_PROVIDERS[providerKey].authKey;
}

export function providerEnvVar(providerKey: UsageProviderKey): string | undefined {
  return (USAGE_PROVIDERS[providerKey] as UsageProviderDescriptor).envVar;
}

export function providerFooterPolicy(
  providerKey: UsageProviderKey,
): ProviderFooterPolicy | undefined {
  return (USAGE_PROVIDERS[providerKey] as UsageProviderDescriptor).footer;
}

export function providerUsesAccountId(
  providerKey: UsageProviderKey,
): providerKey is AccountIdProviderKey {
  return (USAGE_PROVIDERS[providerKey] as UsageProviderDescriptor).accountId === true;
}
