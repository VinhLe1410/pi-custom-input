import type { ThemeColor } from "@earendil-works/pi-coding-agent";

export const RESET_ICON = "";

export function percentColor(percent: number): ThemeColor {
  if (percent >= 85) return "error";
  if (percent >= 60) return "warning";
  return "success";
}

export function contextColor(percent: number): ThemeColor {
  if (percent >= 60) return "error";
  if (percent >= 40) return "warning";
  return "success";
}

export function thinkingColor(thinkingLevel: string): ThemeColor {
  switch (thinkingLevel) {
    case "minimal":
      return "thinkingMinimal";
    case "low":
      return "thinkingLow";
    case "medium":
      return "thinkingMedium";
    case "high":
      return "thinkingHigh";
    case "xhigh":
      return "thinkingXhigh";
    default:
      return "thinkingOff";
  }
}

