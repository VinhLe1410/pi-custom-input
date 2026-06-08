import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { AuthJson } from "../core/types";

interface CodexCredentials {
  token: string;
  accountId?: string;
}

interface ClaudeKeychainData {
  claudeAiOauth?: {
    accessToken?: string;
  };
}

interface CodexAuthFile {
  OPENAI_API_KEY?: string;
  tokens?: {
    access_token?: string;
    account_id?: string;
  };
}

interface GeminiOAuthFile {
  access_token?: string;
}

export interface AuthResolver {
  tokenFor(providerKey: string): string | undefined;
  accountIdFor?(providerKey: string): string | undefined;
}

function loadAuthJson(): AuthJson {
  const authPath = join(homedir(), ".pi", "agent", "auth.json");
  try {
    if (existsSync(authPath)) {
      return JSON.parse(readFileSync(authPath, "utf-8"));
    }
  } catch {}
  return {};
}

function resolveAuthValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (trimmed.startsWith("!")) {
    try {
      const output = execSync(trimmed.slice(1), {
        encoding: "utf-8",
        stdio: ["pipe", "pipe", "pipe"],
        timeout: 2000,
      }).trim();
      return output || undefined;
    } catch {
      return undefined;
    }
  }

  if (/^[A-Z][A-Z0-9_]*$/.test(trimmed) && process.env[trimmed]) {
    return process.env[trimmed];
  }

  return trimmed;
}

function getApiKey(providerKey: string, envVar: string): string | undefined {
  if (process.env[envVar]) return process.env[envVar];

  const auth = loadAuthJson();
  const entry = auth[providerKey];
  if (!entry) return undefined;

  if (typeof entry === "string") {
    return resolveAuthValue(entry);
  }

  return resolveAuthValue(entry.key ?? entry.access ?? entry.refresh);
}

function getClaudeToken(): string | undefined {
  const auth = loadAuthJson();
  if (auth.anthropic?.access) return auth.anthropic.access;

  try {
    const keychainData = execSync(
      'security find-generic-password -s "Claude Code-credentials" -w 2>/dev/null',
      { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    ).trim();
    if (keychainData) {
      const parsed = JSON.parse(keychainData) as ClaudeKeychainData;
      if (parsed.claudeAiOauth?.accessToken) {
        return parsed.claudeAiOauth.accessToken;
      }
    }
  } catch {}

  return undefined;
}

function getCopilotToken(): string | undefined {
  const auth = loadAuthJson();
  return auth["github-copilot"]?.refresh;
}

function getCodexCredentials(): CodexCredentials | undefined {
  const auth = loadAuthJson();
  if (auth["openai-codex"]?.access) {
    return {
      token: auth["openai-codex"].access,
      accountId: auth["openai-codex"]?.accountId,
    };
  }

  // Fallback: ~/.codex/auth.json
  const codexPath = join(
    process.env.CODEX_HOME || join(homedir(), ".codex"),
    "auth.json",
  );
  try {
    if (existsSync(codexPath)) {
      const data = JSON.parse(
        readFileSync(codexPath, "utf-8"),
      ) as CodexAuthFile;
      if (data.OPENAI_API_KEY) {
        return { token: data.OPENAI_API_KEY };
      }
      if (data.tokens?.access_token) {
        return {
          token: data.tokens.access_token,
          accountId: data.tokens.account_id,
        };
      }
    }
  } catch {}

  return undefined;
}

function getGeminiToken(): string | undefined {
  const auth = loadAuthJson();
  if (auth["google-gemini-cli"]?.access) {
    return auth["google-gemini-cli"].access;
  }

  // Fallback: ~/.gemini/oauth_creds.json
  const geminiPath = join(homedir(), ".gemini", "oauth_creds.json");
  try {
    if (existsSync(geminiPath)) {
      const data = JSON.parse(
        readFileSync(geminiPath, "utf-8"),
      ) as GeminiOAuthFile;
      return data.access_token;
    }
  } catch {}

  return undefined;
}

function getMinimaxToken(
  provider: "minimax" | "minimax-cn",
): string | undefined {
  return provider === "minimax"
    ? getApiKey("minimax", "MINIMAX_API_KEY")
    : getApiKey("minimax-cn", "MINIMAX_CN_API_KEY");
}

function getKimiToken(): string | undefined {
  return getApiKey("kimi-coding", "KIMI_API_KEY");
}

export function createAuthResolver(): AuthResolver {
  return {
    tokenFor(providerKey: string): string | undefined {
      switch (providerKey) {
        case "claude":
          return getClaudeToken();
        case "copilot":
          return getCopilotToken();
        case "codex":
          return getCodexCredentials()?.token;
        case "gemini":
          return getGeminiToken();
        case "minimax":
          return getMinimaxToken("minimax");
        case "minimax-cn":
          return getMinimaxToken("minimax-cn");
        case "kimi-coding":
          return getKimiToken();
        default:
          return undefined;
      }
    },
    accountIdFor(providerKey: string): string | undefined {
      if (providerKey !== "codex") return undefined;
      return getCodexCredentials()?.accountId;
    },
  };
}
