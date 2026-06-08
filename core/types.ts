import type { ProviderAuthKey, UsageProviderKey } from "./providers";

export interface RateWindow {
  label: string;
  usedPercent: number;
  resetsIn?: string; // human readable "2h38m"
}

export interface UsageSnapshot {
  providerKey: UsageProviderKey;
  provider: string;
  windows: RateWindow[];
  error?: string;
  fetchedAt: number;
}

export interface AuthEntry {
  key?: string;
  access?: string;
  refresh?: string;
  accountId?: string;
}

export type AuthJson = Partial<Record<ProviderAuthKey, AuthEntry>> &
  Record<string, string | AuthEntry | undefined>;
