import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import type { TUI } from "@earendil-works/pi-tui";
import { PROJECT_REFRESH_INTERVAL_MS } from "../core/runtime-config";
import { createFeatureHost, type FeatureHost } from "../features/host";
import { createUsageQuotaFeature } from "../features/usage-quota";
import { createGitState, type GitState } from "../seams/git";
import {
  createProjectRefreshController,
  type ProjectRefreshController,
} from "../seams/project-refresh";
import { BORDER_CHASE, BORDER_CHASE_FRAME_COUNT } from "./design-tokens";
import { getThinkingLevel } from "./editor-meta";
import type { InputStyleRuntime } from "./input-styles/types";

export class InputStyleRuntimeController implements InputStyleRuntime {
  readonly git: GitState;
  readonly features: FeatureHost;
  readonly projectRefresh: ProjectRefreshController;

  private activeTui: TUI | undefined;
  private footerRender: (() => void) | undefined;
  private promptUiActive = false;
  private chaseEnabled = false;
  private chaseTimer: ReturnType<typeof setInterval> | undefined;
  private chaseActive = false;
  private chaseFrameIndex = 0;
  private workingMessage: string | undefined;
  private cachedThinkingLevel: string | undefined;

  constructor() {
    this.git = createGitState();
    this.features = createFeatureHost([
      createUsageQuotaFeature({ requestRender: () => this.requestRender() }),
    ]);
    this.projectRefresh = createProjectRefreshController({
      git: this.git,
      intervalMs: PROJECT_REFRESH_INTERVAL_MS,
      onChange: () => this.requestRender(),
    });
  }

  getThinkingLevel(ctx: ExtensionContext): string {
    return this.cachedThinkingLevel ?? getThinkingLevel(ctx);
  }

  getWorkingMessage(): string | undefined {
    return this.workingMessage;
  }

  isBorderChaseActive(): boolean {
    return this.chaseActive;
  }

  getBorderChaseFrameIndex(): number {
    return this.chaseFrameIndex;
  }

  registerActiveTui(tui: TUI | undefined): void {
    this.activeTui = tui;
  }

  registerFooterRender(fn: (() => void) | undefined): void {
    this.footerRender = fn;
  }

  requestRender(): void {
    if (this.activeTui) {
      this.activeTui.requestRender();
      return;
    }
    this.footerRender?.();
  }

  stopBorderChase(render = true): void {
    const wasRunning = this.chaseActive || this.chaseTimer !== undefined;
    if (this.chaseTimer) {
      clearInterval(this.chaseTimer);
      this.chaseTimer = undefined;
    }
    this.chaseActive = false;
    this.chaseFrameIndex = 0;
    if (render && wasRunning) this.requestRender();
  }

  setChaseEnabled(enabled: boolean): void {
    this.chaseEnabled = enabled;
  }

  refreshThinkingLevel(ctx: ExtensionContext): void {
    this.cachedThinkingLevel = getThinkingLevel(ctx);
  }

  setWorkingMessage(msg: string | undefined): void {
    this.workingMessage = msg;
  }

  setPromptUiActive(active: boolean): void {
    this.promptUiActive = active;
  }

  startBorderChase(): void {
    if (!this.promptUiActive || !this.chaseEnabled) return;

    this.stopBorderChase(false);
    this.chaseActive = true;
    this.chaseFrameIndex = 0;
    this.chaseTimer = setInterval(() => {
      this.chaseFrameIndex = (this.chaseFrameIndex + 1) % BORDER_CHASE_FRAME_COUNT;
      this.requestRender();
    }, BORDER_CHASE.intervalMs);
    this.chaseTimer.unref?.();
    this.requestRender();
  }

  shutdown(): void {
    this.activeTui = undefined;
    this.footerRender = undefined;
    this.workingMessage = undefined;
    this.cachedThinkingLevel = undefined;
    this.promptUiActive = false;
    this.chaseEnabled = false;
  }
}
