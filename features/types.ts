import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";

export interface FeatureServices {
  requestRender(): void;
}

export interface ExtensionFeature {
  sessionStart?(ctx: ExtensionContext): void;
  sessionShutdown?(ctx: ExtensionContext): void;
  modelSelect?(ctx: ExtensionContext): void;
  footerRight?(theme: Theme): readonly string[];
}
