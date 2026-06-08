import type { UsageProviderKey } from "../core/providers";
import type { UsageSnapshot } from "../core/types";
import type { UsageFetcher } from "../fetchers";

interface UsageStateOptions {
  registry: Map<UsageProviderKey, UsageFetcher>;
  intervalMs: number;
}

export interface UsageState {
  start(provider: UsageProviderKey): void;
  stop(): void;
  current(): UsageSnapshot | null;
  onChange(callback: () => void): () => void;
}

export function createUsageState(options: UsageStateOptions): UsageState {
  const usageCache = new Map<UsageProviderKey, UsageSnapshot>();
  const listeners = new Set<() => void>();

  let latestUsage: UsageSnapshot | null = null;
  let activeProvider: UsageProviderKey | null = null;
  let refreshTimer: ReturnType<typeof setInterval> | null = null;
  let requestVersion = 0;

  function notifyChange(): void {
    for (const listener of listeners) {
      listener();
    }
  }

  function setLatestUsage(next: UsageSnapshot | null): void {
    if (latestUsage === next) return;
    latestUsage = next;
    notifyChange();
  }

  function fetchAndCache(provider: UsageProviderKey): void {
    const fetcher = options.registry.get(provider);
    if (!fetcher) return;

    const cached = usageCache.get(provider);
    const fetchVersion = ++requestVersion;

    fetcher
      .fetch()
      .then((snapshot) => {
        if (!snapshot) return;
        if (activeProvider !== provider) return;
        if (fetchVersion !== requestVersion) return;
        if (
          snapshot.windows.length === 0 &&
          snapshot.error &&
          cached?.windows.length
        )
          return;

        usageCache.set(provider, snapshot);
        setLatestUsage(snapshot);
      })
      .catch(() => {});
  }

  function startTimer(): void {
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(() => {
      if (activeProvider) fetchAndCache(activeProvider);
    }, options.intervalMs);
  }

  return {
    start(provider: UsageProviderKey): void {
      activeProvider = provider;

      const cached = usageCache.get(provider);
      if (cached && cached.windows.length > 0) {
        setLatestUsage(cached);
      } else if (latestUsage !== null) {
        setLatestUsage(null);
      }

      fetchAndCache(provider);
      startTimer();
    },
    stop(): void {
      activeProvider = null;
      requestVersion += 1;
      if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
      }
      setLatestUsage(null);
    },
    current(): UsageSnapshot | null {
      return latestUsage;
    },
    onChange(callback: () => void): () => void {
      listeners.add(callback);
      return () => {
        listeners.delete(callback);
      };
    },
  };
}
