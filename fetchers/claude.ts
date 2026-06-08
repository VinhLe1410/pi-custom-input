import { formatResetTime, normalizePercent } from "../core/format";
import { fetchWithTimeout } from "../core/network";
import type { RateWindow, UsageSnapshot } from "../core/types";
import type { AuthResolver } from "../seams/auth";
import type { UsageFetcher } from "./index";

interface ClaudeUsageResponse {
  five_hour?: { utilization: number; resets_at?: string };
  seven_day?: { utilization: number; resets_at?: string };
}

export function createClaudeFetcher(auth: AuthResolver): UsageFetcher {
  return {
    async fetch(): Promise<UsageSnapshot> {
      const token = auth.tokenFor("claude");
      if (!token) {
        return {
          provider: "Claude",
          windows: [],
          error: "no-auth",
          fetchedAt: Date.now(),
        };
      }

      try {
        const res = await fetchWithTimeout("https://api.anthropic.com/api/oauth/usage", {
          headers: {
            Authorization: `Bearer ${token}`,
            "anthropic-beta": "oauth-2025-04-20",
          },
        });

        if (!res.ok) {
          return {
            provider: "Claude",
            windows: [],
            error: `HTTP ${res.status}`,
            fetchedAt: Date.now(),
          };
        }

        const data = (await res.json()) as ClaudeUsageResponse;
        const windows: RateWindow[] = [];

        if (data.five_hour?.utilization !== undefined) {
          windows.push({
            label: "5h",
            usedPercent: normalizePercent(data.five_hour.utilization),
            resetsIn: data.five_hour.resets_at
              ? formatResetTime(new Date(data.five_hour.resets_at))
              : undefined,
          });
        }

        if (data.seven_day?.utilization !== undefined) {
          windows.push({
            label: "Week",
            usedPercent: normalizePercent(data.seven_day.utilization),
            resetsIn: data.seven_day.resets_at
              ? formatResetTime(new Date(data.seven_day.resets_at))
              : undefined,
          });
        }

        return { provider: "Claude", windows, fetchedAt: Date.now() };
      } catch (e: unknown) {
        return {
          provider: "Claude",
          windows: [],
          error: String(e),
          fetchedAt: Date.now(),
        };
      }
    },
  };
}
