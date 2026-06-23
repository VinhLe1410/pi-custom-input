import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { renderPinnedCluster, hidePinnedSlots } from "./pinned-cluster-policy";
import { discoverStickySlots } from "./slot-discovery";
import { TerminalSplitCompositor } from "./terminal-split";
import { installStickyUiCapture, type StickyUiCapture } from "./ui-capture";
import type { StickyTuiLike } from "./types";

interface StickyInputRuntimeOptions {
  copyToClipboard(text: string): void;
}

interface StopOptions {
  resetExtendedKeyboardModes: boolean;
}

export class StickyInputRuntime {
  private readonly copyToClipboard: (text: string) => void;
  private compositor: TerminalSplitCompositor | null = null;
  private capture: StickyUiCapture | null = null;

  constructor(options: StickyInputRuntimeOptions) {
    this.copyToClipboard = options.copyToClipboard;
  }

  start(ctx: ExtensionContext): void {
    if (ctx.mode !== "tui") return;

    this.stop({ resetExtendedKeyboardModes: false });

    let capturedTui: StickyTuiLike | null = null;
    let capturedEditor: unknown = null;
    let installTimer: ReturnType<typeof setTimeout> | null = null;

    const clearInstallTimer = (): void => {
      if (installTimer === null) return;
      clearTimeout(installTimer);
      installTimer = null;
    };

    const disposeCompositor = (): void => {
      this.compositor?.dispose({ resetExtendedKeyboardModes: false });
      this.compositor = null;
    };

    const install = (): void => {
      if (!capturedTui) return;

      disposeCompositor();
      const tui = capturedTui;
      const slots = discoverStickySlots(tui, capturedEditor);

      if (!slots) {
        installTimer = setTimeout(install, 0);
        return;
      }

      let nextCompositor: TerminalSplitCompositor;
      nextCompositor = new TerminalSplitCompositor({
        tui,
        terminal: tui.terminal,
        mouseScroll: true,
        onCopySelection: this.copyToClipboard,
        getShowHardwareCursor: () => tui.getShowHardwareCursor?.() ?? false,
        renderCluster: (width, terminalRows) => renderPinnedCluster({
          compositor: nextCompositor,
          slots,
          width,
          terminalRows,
        }),
      });

      hidePinnedSlots(nextCompositor, slots);
      nextCompositor.install();
      this.compositor = nextCompositor;
      tui.requestRender?.();
    };

    const scheduleInstall = (): void => {
      if (installTimer !== null) return;
      installTimer = setTimeout(() => {
        installTimer = null;
        install();
      }, 0);
    };

    this.capture = installStickyUiCapture(ctx.ui, {
      editorFactoryStarted: (tui) => {
        capturedTui = tui;
        disposeCompositor();
      },
      editorCaptured: (tui, editor) => {
        capturedTui = tui;
        capturedEditor = editor;
        scheduleInstall();
      },
      footerFactoryStarted: (tui) => {
        capturedTui ??= tui;
        disposeCompositor();
      },
      footerCaptured: (tui) => {
        capturedTui ??= tui;
        scheduleInstall();
      },
      probeCaptured: (tui) => {
        capturedTui = tui;
      },
    });

    const capture = this.capture;
    this.capture = {
      restore: () => {
        clearInstallTimer();
        capture.restore();
      },
    };

    scheduleInstall();
  }

  shutdown(): void {
    this.stop({ resetExtendedKeyboardModes: true });
  }

  private stop(options: StopOptions): void {
    this.compositor?.dispose(options);
    this.compositor = null;
    this.capture?.restore();
    this.capture = null;
  }
}
