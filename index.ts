import type { ExtensionAPI, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
  loadInputStyleConfig,
  saveInputStyleConfig,
  type InputStyle,
} from "./core/input-style-config";
import { InputStyleRuntimeController } from "./ui/input-style-runtime";
import { findInputStyleAdapter } from "./ui/input-styles";
import { showInputStyleMenu } from "./ui/input-style-menu";
import installStickyInput from "./ui/sticky/controller";
import { pickWorkingMessage } from "./whimsical/messages";

export default function (pi: ExtensionAPI) {
  installStickyInput(pi);
  const runtime = new InputStyleRuntimeController();
  let activeStyle: InputStyle = loadInputStyleConfig().style;

  function applyInputStyle(ctx: ExtensionContext, style: InputStyle): void {
    activeStyle = style;
    findInputStyleAdapter(style)?.apply(ctx, runtime);
    runtime.requestRender();
  }

  pi.registerCommand("input-style", {
    description: "Select pi-input-3000 input style",
    handler: async (_args, ctx) => {
      if (ctx.mode !== "tui") {
        ctx.ui.notify("/input-style requires TUI mode", "error");
        return;
      }

      const selected = await showInputStyleMenu(ctx, activeStyle);
      if (!selected) return;

      try {
        saveInputStyleConfig({ style: selected });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(`Failed to save input style: ${message}`, "error");
        return;
      }

      applyInputStyle(ctx, selected);
      ctx.ui.notify(
        `Input style: ${selected === "amp" ? "Amp-inspired" : "Default"}`,
        "info",
      );
    },
  });

  pi.on("session_start", (_event, ctx) => {
    runtime.refreshThinkingLevel(ctx);

    if (ctx.mode !== "tui") {
      runtime.setPromptUiActive(false);
      return;
    }

    runtime.setPromptUiActive(true);
    applyInputStyle(ctx, loadInputStyleConfig().style);
  });

  pi.on("session_shutdown", (_event, ctx) => {
    runtime.stopBorderChase(false);
    runtime.projectRefresh.stop();
    runtime.features.sessionShutdown(ctx);
    runtime.shutdown();

    if (ctx.mode !== "tui") return;
    ctx.ui.setHeader(undefined);
    ctx.ui.setFooter(undefined);
    ctx.ui.setWorkingMessage();
    ctx.ui.setWorkingIndicator();
    ctx.ui.setWorkingVisible(true);
  });

  pi.on("turn_start", () => {
    runtime.setWorkingMessage(pickWorkingMessage());
    runtime.requestRender();
  });

  pi.on("agent_start", () => {
    runtime.startBorderChase();
  });

  pi.on("agent_end", () => {
    runtime.stopBorderChase();
  });

  pi.on("turn_end", (_event, ctx) => {
    runtime.setWorkingMessage(undefined);
    runtime.refreshThinkingLevel(ctx);
    findInputStyleAdapter(activeStyle)?.onTurnEnd?.(ctx, runtime);
    runtime.requestRender();
  });

  pi.on("message_end", () => {
    runtime.requestRender();
  });

  pi.on("session_tree", (_event, ctx) => {
    runtime.refreshThinkingLevel(ctx);
    runtime.requestRender();
  });

  pi.on("session_compact", (_event, ctx) => {
    runtime.refreshThinkingLevel(ctx);
    runtime.requestRender();
  });

  pi.on("model_select", (_event, ctx) => {
    findInputStyleAdapter(activeStyle)?.onModelSelect?.(ctx, runtime);
    runtime.refreshThinkingLevel(ctx);
    runtime.requestRender();
  });

  pi.on("thinking_level_select", (_event, ctx) => {
    runtime.refreshThinkingLevel(ctx);
    runtime.requestRender();
  });
}
