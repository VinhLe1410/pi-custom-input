import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { ExtensionFeature } from "./types";

export interface FeatureHost {
  sessionStart(ctx: ExtensionContext): void;
  sessionShutdown(ctx: ExtensionContext): void;
  modelSelect(ctx: ExtensionContext): void;
  footerRight(theme: Theme): string[];
}

export function createFeatureHost(features: readonly ExtensionFeature[]): FeatureHost {
  return {
    sessionStart(ctx: ExtensionContext): void {
      for (const feature of features) feature.sessionStart?.(ctx);
    },
    sessionShutdown(ctx: ExtensionContext): void {
      for (const feature of features) feature.sessionShutdown?.(ctx);
    },
    modelSelect(ctx: ExtensionContext): void {
      for (const feature of features) feature.modelSelect?.(ctx);
    },
    footerRight(theme: Theme): string[] {
      return features.flatMap((feature) => [...(feature.footerRight?.(theme) ?? [])]);
    },
  };
}

export type { ExtensionFeature, FeatureServices } from "./types";
