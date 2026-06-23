import {
  buildSessionContext,
  type ExtensionContext,
} from "@earendil-works/pi-coding-agent";
import { roundedDisplayPercent } from "./format";

export interface EditorContextMeter {
  percent: number;
  label: string;
}

export interface SharedEditorMeta {
  modelLabel: string;
  thinkingLevel: string;
  contextMeter?: EditorContextMeter;
}

function formatContextWindow(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded =
      millions < 10 ? millions.toFixed(1).replace(/\.0$/, "") : `${Math.round(millions)}`;
    return `${rounded}M`;
  }

  if (value >= 1_000) {
    const thousands = value / 1_000;
    const rounded =
      thousands < 10 ? thousands.toFixed(1).replace(/\.0$/, "") : `${Math.round(thousands)}`;
    return `${rounded}K`;
  }

  return `${Math.round(value)}`;
}

function buildContextMeter(ctx: ExtensionContext): EditorContextMeter | undefined {
  const usage = ctx.getContextUsage();
  const contextWindow = usage?.contextWindow ?? ctx.model?.contextWindow;
  if (!contextWindow || contextWindow <= 0) return undefined;

  if (usage && (usage.tokens === null || usage.percent === null)) {
    return {
      percent: 0,
      label: `?/${formatContextWindow(contextWindow)}`,
    };
  }

  const tokens = usage?.tokens ?? 0;
  const percent = usage?.percent ?? (tokens / contextWindow) * 100;
  const roundedPercent = roundedDisplayPercent(percent);

  return {
    percent: roundedPercent,
    label: `${roundedPercent}%/${formatContextWindow(contextWindow)}`,
  };
}

export function getThinkingLevel(ctx: ExtensionContext): string {
  if (!ctx.model?.reasoning) return "off";

  const entries = ctx.sessionManager.getEntries();
  const leafId = ctx.sessionManager.getLeafId();
  return buildSessionContext(entries, leafId).thinkingLevel || "off";
}

export function buildSharedEditorMeta(
  ctx: ExtensionContext,
  thinkingLevel = getThinkingLevel(ctx),
): SharedEditorMeta {
  return {
    modelLabel: ctx.model?.name ?? ctx.model?.id ?? "no-model",
    thinkingLevel,
    contextMeter: buildContextMeter(ctx),
  };
}
