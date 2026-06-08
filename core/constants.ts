export const USAGE_REFRESH_INTERVAL = 2 * 60_000;
export const PROJECT_REFRESH_INTERVAL_MS = 30_000;

// Map pi provider names to our internal usage provider keys.
export const PROVIDER_MAP: Record<string, string> = {
  anthropic: "claude",
  "openai-codex": "codex",
  "github-copilot": "copilot",
  "google-gemini-cli": "gemini",
  minimax: "minimax",
  "minimax-cn": "minimax-cn",
  "kimi-coding": "kimi-coding",
};
