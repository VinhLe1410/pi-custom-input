import { clampPercent, formatResetTime, getWindowLabel } from "../core/format";
import { fetchWithTimeout } from "../core/network";
import { providerDisplayName, type UsageProviderKey } from "../core/providers";
import type { RateWindow, UsageSnapshot } from "../core/types";
import type { AuthResolver } from "../seams/auth";
import type { UsageFetcher } from "./index";

interface KimiLimitDetail {
  limit?: number | string;
  remaining?: number | string;
  resetTime?: string;
}

interface KimiWindow {
  duration?: number;
  timeUnit?: string;
}

interface KimiLimit {
  detail?: KimiLimitDetail;
  window?: KimiWindow;
}

interface KimiUsageData {
  limit?: number | string;
  remaining?: number | string;
  resetTime?: string;
}

interface KimiUsageResponse {
  limits?: KimiLimit[];
  usage?: KimiUsageData;
}

export function createKimiFetcher(auth: AuthResolver): UsageFetcher {
  return {
    async fetch(): Promise<UsageSnapshot> {
      const providerKey: UsageProviderKey = "kimi-coding";
      const providerLabel = providerDisplayName(providerKey);
      const token = auth.tokenFor(providerKey);
      const endpoint = "https://api.kimi.com/coding/v1/usages";

      if (!token) {
        return {
          providerKey,
          provider: providerLabel,
          windows: [],
          error: "no-auth",
          fetchedAt: Date.now(),
        };
      }

      try {
        const res = await fetchWithTimeout(endpoint, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          return {
            providerKey,
            provider: providerLabel,
            windows: [],
            error: `HTTP ${res.status}`,
            fetchedAt: Date.now(),
          };
        }

        const data = (await res.json()) as KimiUsageResponse;
        const windows: RateWindow[] = [];

        for (const limit of data.limits || []) {
          const windowLimit = Number(limit.detail?.limit) || 0;
          const windowRemaining = Number(limit.detail?.remaining) || 0;
          if (windowLimit > 0) {
            const used = windowLimit - windowRemaining;
            const usedPercent = clampPercent((used / windowLimit) * 100);
            const resetDate = limit.detail?.resetTime
              ? new Date(limit.detail.resetTime)
              : undefined;
            const durationMs =
              limit.window?.duration && limit.window?.timeUnit === "TIME_UNIT_MINUTE"
                ? limit.window.duration * 60 * 1000
                : undefined;

            windows.push({
              label: getWindowLabel(durationMs, "5h"),
              usedPercent,
              resetsIn: resetDate ? formatResetTime(resetDate) : undefined,
            });
          }
        }

        const weeklyLimit = Number(data.usage?.limit) || 0;
        const weeklyRemaining = Number(data.usage?.remaining) || 0;
        const weeklyResetTime = data.usage?.resetTime;

        if (weeklyLimit > 0) {
          const used = weeklyLimit - weeklyRemaining;
          const usedPercent = clampPercent((used / weeklyLimit) * 100);
          windows.push({
            label: "Weekly",
            usedPercent,
            resetsIn: weeklyResetTime ? formatResetTime(new Date(weeklyResetTime)) : undefined,
          });
        }

        return { providerKey, provider: providerLabel, windows, fetchedAt: Date.now() };
      } catch (e: unknown) {
        return {
          providerKey,
          provider: providerLabel,
          windows: [],
          error: String(e),
          fetchedAt: Date.now(),
        };
      }
    },
  };
}
