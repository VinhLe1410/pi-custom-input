import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { ExtensionFeature, FeatureServices } from "../types";
import { USAGE_QUOTA_REFRESH_INTERVAL_MS } from "./config";
import { renderQuotaSegments } from "./render";
import { createUsageQuotaState } from "./state";

export function createUsageQuotaFeature(services: FeatureServices): ExtensionFeature {
  const state = createUsageQuotaState({
    intervalMs: USAGE_QUOTA_REFRESH_INTERVAL_MS,
    onChange: services.requestRender,
  });

  function syncWithContext(ctx: ExtensionContext): void {
    if (ctx.mode === "tui") state.start(ctx);
    else state.stop();
  }

  return {
    sessionStart(ctx: ExtensionContext): void {
      syncWithContext(ctx);
    },
    sessionShutdown(): void {
      state.stop();
    },
    modelSelect(ctx: ExtensionContext): void {
      syncWithContext(ctx);
    },
    footerRight(theme: Theme): readonly string[] {
      return renderQuotaSegments(state.current(), theme);
    },
  };
}

export { CODEX_PROVIDER_KEY } from "./types";
export type { CodexQuotaWindow, QuotaState } from "./types";
