export interface RateWindow {
  label: string;
  usedPercent: number;
  resetsIn?: string; // human readable "2h38m"
}

export interface UsageSnapshot {
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

export interface AuthJson {
  [key: string]: string | AuthEntry | undefined;
  anthropic?: AuthEntry;
  "github-copilot"?: AuthEntry;
  "openai-codex"?: AuthEntry;
  "google-gemini-cli"?: AuthEntry;
  minimax?: AuthEntry;
  "minimax-cn"?: AuthEntry;
  "kimi-coding"?: AuthEntry;
}
