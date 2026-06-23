import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import type { InputStyle } from "../../core/input-style-config";
import type { GitState } from "../../seams/git";
import type { FeatureHost } from "../../features/host";
import type { ProjectRefreshController } from "../../seams/project-refresh";

export interface InputStyleRuntime {
  readonly git: GitState;
  readonly features: FeatureHost;
  readonly projectRefresh: ProjectRefreshController;

  getThinkingLevel(ctx: ExtensionContext): string;
  getWorkingMessage(): string | undefined;
  isBorderChaseActive(): boolean;
  getBorderChaseFrameIndex(): number;

  registerActiveTui(tui: TUI | undefined): void;
  registerFooterRender(fn: (() => void) | undefined): void;
  requestRender(): void;
  stopBorderChase(render?: boolean): void;
  setChaseEnabled(enabled: boolean): void;
}

export interface InputStyleAdapter {
  readonly id: InputStyle;
  readonly label: string;
  readonly description: string;
  apply(ctx: ExtensionContext, runtime: InputStyleRuntime): void;
  renderPreview(ctx: ExtensionContext, width: number, theme: Theme): string[];
  onTurnEnd?(ctx: ExtensionContext, runtime: InputStyleRuntime): void;
  onModelSelect?(ctx: ExtensionContext, runtime: InputStyleRuntime): void;
}
