import { CustomEditor } from "@earendil-works/pi-coding-agent";
import type { KeybindingsManager, Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import {
  type Component,
  type EditorTheme,
  type TUI,
  truncateToWidth,
  visibleWidth,
} from "@earendil-works/pi-tui";
import {
  blendRgb,
  heavyBorderChar,
  parseAnsiRgb,
  rgbBg,
  rgbFg,
  type Rgb,
} from "./border-chase";
import { contextColor, thinkingColor } from "./theme";

const RAIL_GAP = " ";
const RIGHT_RAIL_GAP = " ";
const CONTEXT_METER_WIDTH = 18;
const CHASE_TRAIL_RATIO = 0.5;
const CHASE_HEAVY_RATIO = 0.5;
const CHASE_HEAD_RATIO = 0.2;

export interface EditorContextMeter {
  percent: number;
  label: string;
}

export interface EditorBranchMeta {
  name: string;
  dirty: boolean;
  ahead: number;
  behind: number;
}

export interface EditorMeta {
  modelLabel: string;
  thinkingLevel: string;
  contextMeter?: EditorContextMeter;
  branch?: EditorBranchMeta;
}

export interface EditorChrome {
  meta: EditorMeta;
  chaseFrameIndex?: number;
  chaseFrameCount?: number;
  workingMessage?: string;
}

interface BorderChase {
  head: number;
  perimeter: number;
  trailLength: number;
  heavyLength: number;
  headLength: number;
}

type AutocompleteEditorInternals = {
  autocompleteList?: Pick<Component, "render">;
  isShowingAutocomplete?: () => boolean;
};

interface EditorFrameParts {
  editorFrame: string[];
  autocompleteLines: string[];
}

function padRight(text: string, width: number): string {
  return text + " ".repeat(Math.max(0, width - visibleWidth(text)));
}

function clampRenderedLines(lines: string[], width: number): string[] {
  const maxWidth = Math.max(0, width);
  return lines.map((line) => truncateToWidth(line, maxWidth, ""));
}

export class PolishedInputEditor extends CustomEditor {
  private getChrome: () => EditorChrome;
  private labelTheme: Theme;
  private colorCache = new Map<ThemeColor, Rgb | undefined>();

  constructor(
    tui: TUI,
    theme: EditorTheme,
    keybindings: KeybindingsManager,
    getChrome: () => EditorChrome,
    labelTheme: Theme,
  ) {
    super(tui, theme, keybindings, { paddingX: 0 });
    this.borderColor = (text: string) => labelTheme.fg("border", text);
    this.getChrome = getChrome;
    this.labelTheme = labelTheme;
  }

  render(width: number): string[] {
    if (width <= 2) return clampRenderedLines(super.render(width), width);

    const chrome = this.getChrome();
    const { meta } = chrome;
    const rail = this.renderRail();
    const rightRail = this.renderRightRail();
    const railWidth = visibleWidth(rail);
    const rightRailWidth = visibleWidth(rightRail);
    const innerWidth = Math.max(1, width - railWidth - rightRailWidth);
    const rendered = super.render(innerWidth);

    if (rendered.length < 2) {
      return clampRenderedLines(super.render(width), width);
    }

    const { editorFrame, autocompleteLines } = this.splitRenderedEditor(rendered, innerWidth);
    if (editorFrame.length < 2) return clampRenderedLines(rendered, width);

    const editorLines = editorFrame.slice(1, -1);
    const metadata = this.renderMetadata(meta, innerWidth);
    const lines = ["", ...editorLines, "", metadata];
    const hasSuggestions = autocompleteLines.length > 0;
    const rowCount = lines.length + autocompleteLines.length + (hasSuggestions ? 1 : 0);
    const chase = this.createBorderChase(width, rowCount, chrome);
    const top = this.renderTopBorder(width, chase, chrome.workingMessage);
    const rows = lines.map((line, index) =>
      this.renderContentRow(line, index, rowCount, width, innerWidth, chase),
    );

    if (hasSuggestions) {
      rows.push(this.renderSuggestionDivider(width));
      rows.push(
        ...autocompleteLines.map((line, index) =>
          this.renderContentRow(line, lines.length + 1 + index, rowCount, width, innerWidth, chase),
        ),
      );
    }

    return clampRenderedLines(
      [
        top,
        ...rows,
        this.renderBottomBorder(width, rowCount, chase),
      ],
      width,
    );
  }

  private splitRenderedEditor(rendered: string[], innerWidth: number): EditorFrameParts {
    const editorInternals = this as unknown as AutocompleteEditorInternals;
    const isShowingAutocomplete =
      typeof editorInternals.isShowingAutocomplete === "function" &&
      editorInternals.isShowingAutocomplete();
    const autocompleteCount =
      isShowingAutocomplete && typeof editorInternals.autocompleteList?.render === "function"
        ? editorInternals.autocompleteList.render(innerWidth).length
        : 0;

    if (autocompleteCount <= 0 || autocompleteCount >= rendered.length) {
      return { editorFrame: rendered, autocompleteLines: [] };
    }

    return {
      editorFrame: rendered.slice(0, -autocompleteCount),
      autocompleteLines: rendered.slice(-autocompleteCount),
    };
  }

  private renderContentRow(
    line: string,
    rowIndex: number,
    rowCount: number,
    width: number,
    innerWidth: number,
    chase?: BorderChase,
  ): string {
    return `${this.renderRail(rowIndex, rowCount, width, chase)}${this.fillLine(line, innerWidth)}${this.renderRightRail(rowIndex, width, chase)}`;
  }

  private renderRail(
    rowIndex?: number,
    rowCount?: number,
    width?: number,
    chase?: BorderChase,
  ): string {
    if (rowIndex === undefined || rowCount === undefined || width === undefined) {
      return this.renderRailBackgroundCell("border") + RAIL_GAP;
    }

    const pathIndex = width * 2 + rowCount + (rowCount - 1 - rowIndex);
    return this.renderRailCell(pathIndex, chase) + RAIL_GAP;
  }

  private renderRightRail(rowIndex?: number, width?: number, chase?: BorderChase): string {
    if (rowIndex === undefined || width === undefined) {
      return RIGHT_RAIL_GAP + this.renderRailBackgroundCell("border");
    }

    const pathIndex = width + rowIndex;
    return RIGHT_RAIL_GAP + this.renderRailCell(pathIndex, chase);
  }

  private renderTopBorder(width: number, chase?: BorderChase, workingMessage?: string): string {
    const chars: string[] = Array.from({ length: Math.max(0, width) }, (_, index) =>
      width <= 1 ? "▄" : index === 0 || index === width - 1 ? "▄" : "─",
    );

    if (workingMessage && width >= 8) {
      const text = truncateToWidth(workingMessage, Math.max(0, width - 4), "");
      const label = Array.from(` ${text} `);
      const labelWidth = visibleWidth(label.join(""));

      if (labelWidth > 0 && labelWidth <= width - 2) {
        const start = Math.max(1, Math.floor((width - labelWidth) / 2));
        for (let offset = 0; offset < label.length && start + offset < width - 1; offset += 1) {
          chars[start + offset] = label[offset]!;
        }
      }
    }

    return chars
      .map((char, index) =>
        this.renderBorderCell(
          char,
          index,
          chase,
          width > 1 && (index === 0 || index === width - 1) ? "border" : "borderMuted",
        ),
      )
      .join("");
  }

  private renderSuggestionDivider(width: number): string {
    return Array.from({ length: Math.max(0, width) }, (_, index) => {
      if (width > 1 && (index === 0 || index === width - 1)) {
        return this.renderRailBackgroundCell("border");
      }

      return this.labelTheme.fg("borderMuted", "─");
    }).join("");
  }

  private renderBottomBorder(width: number, rowCount: number, chase?: BorderChase): string {
    return Array.from({ length: Math.max(0, width) }, (_, index) => {
      const char = width <= 1 ? "▀" : index === 0 || index === width - 1 ? "▀" : "─";
      const pathIndex = width + rowCount + (width - 1 - index);
      return this.renderBorderCell(
        char,
        pathIndex,
        chase,
        width > 1 && (index === 0 || index === width - 1) ? "border" : "borderMuted",
      );
    }).join("");
  }

  private createBorderChase(
    width: number,
    rowCount: number,
    chrome: EditorChrome,
  ): BorderChase | undefined {
    if (chrome.chaseFrameIndex === undefined || !chrome.chaseFrameCount) return undefined;

    const perimeter = Math.max(1, width * 2 + rowCount * 2);
    const progress = (chrome.chaseFrameIndex % chrome.chaseFrameCount) / chrome.chaseFrameCount;
    const trailLength = Math.round(perimeter * CHASE_TRAIL_RATIO);
    return {
      head: Math.floor(progress * perimeter),
      perimeter,
      trailLength,
      heavyLength: Math.round(trailLength * CHASE_HEAVY_RATIO),
      headLength: Math.round(trailLength * CHASE_HEAD_RATIO),
    };
  }

  private renderRailCell(pathIndex: number, chase: BorderChase | undefined): string {
    const distance = chase ? this.chaseDistance(pathIndex, chase) : undefined;
    if (distance !== undefined && chase && distance <= chase.trailLength) {
      return this.renderRailChaseCell(distance, chase);
    }

    return this.renderRailBackgroundCell("border");
  }

  private renderRailBackgroundCell(color: ThemeColor): string {
    const rgb = color === "border" ? this.currentBorderRgb() : this.themeRgb(color);
    if (rgb) return rgbBg(rgb, " ");

    return this.labelTheme.inverse(color === "border" ? this.borderColor(" ") : this.labelTheme.fg(color, " "));
  }

  private renderRailChaseCell(distance: number, chase: BorderChase): string {
    const accent = this.themeRgb("borderAccent");
    const base = this.currentBorderRgb();
    const intensity = distance <= chase.headLength ? 1 : 1 - distance / (chase.trailLength + 1);
    const easedIntensity = intensity * intensity;

    if (!accent || !base) {
      const color = distance <= chase.heavyLength ? "borderAccent" : "border";
      return this.renderRailBackgroundCell(color);
    }

    return rgbBg(blendRgb(base, accent, easedIntensity), " ");
  }

  private currentBorderRgb(): Rgb | undefined {
    return parseAnsiRgb(this.borderColor(" "));
  }

  private renderBorderCell(
    char: string,
    pathIndex: number,
    chase: BorderChase | undefined,
    baseColor: "border" | "borderMuted",
  ): string {
    const distance = chase ? this.chaseDistance(pathIndex, chase) : undefined;
    if (distance !== undefined && chase && distance <= chase.trailLength) {
      return this.renderChaseCell(char, distance, chase, baseColor);
    }

    return baseColor === "border" ? this.borderColor(char) : this.labelTheme.fg("borderMuted", char);
  }

  private renderChaseCell(
    char: string,
    distance: number,
    chase: BorderChase,
    baseColor: "border" | "borderMuted",
  ): string {
    const accent = this.themeRgb("borderAccent");
    const base = baseColor === "border" ? this.currentBorderRgb() : this.themeRgb(baseColor);
    const isHead = distance <= chase.headLength;
    const glyph = distance <= chase.heavyLength ? heavyBorderChar(char) : char;
    const intensity = isHead ? 1 : 1 - distance / (chase.trailLength + 1);
    const easedIntensity = intensity * intensity;

    if (!accent || !base) {
      if (isHead) return this.labelTheme.bold(this.labelTheme.fg("borderAccent", glyph));
      if (distance <= chase.heavyLength) return this.labelTheme.fg("borderAccent", glyph);
      return baseColor === "border" ? this.borderColor(char) : this.labelTheme.fg("borderMuted", char);
    }

    const color = blendRgb(base, accent, easedIntensity);
    const rendered = rgbFg(color, glyph);
    return isHead ? this.labelTheme.bold(rendered) : rendered;
  }

  private themeRgb(color: ThemeColor): Rgb | undefined {
    if (!this.colorCache.has(color)) {
      this.colorCache.set(color, parseAnsiRgb(this.labelTheme.getFgAnsi(color)));
    }
    return this.colorCache.get(color);
  }

  private chaseDistance(pathIndex: number, chase: BorderChase): number {
    return (chase.head - pathIndex + chase.perimeter) % chase.perimeter;
  }

  private fillLine(content: string, width: number): string {
    return padRight(truncateToWidth(content, Math.max(0, width), ""), width);
  }

  private renderMetadata(meta: EditorMeta, width: number): string {
    const left = this.renderIdentityBadge(meta);
    const right = meta.contextMeter ? this.renderContextMeter(meta.contextMeter) : "";

    if (!right) return truncateToWidth(left, width, "");

    const leftWidth = visibleWidth(left);
    const rightWidth = visibleWidth(right);
    const gapWidth = width - leftWidth - rightWidth;
    if (gapWidth >= 2) return `${left}${" ".repeat(gapWidth)}${right}`;

    return truncateToWidth(left, width, "");
  }

  private renderIdentityBadge(meta: EditorMeta): string {
    const model = this.labelTheme.bg(
      "toolPendingBg",
      this.labelTheme.bold(this.labelTheme.fg("text", ` ${meta.modelLabel} `)),
    );
    const effort = this.renderEffortBadge(meta.thinkingLevel);
    const branch = meta.branch ? `  ${this.renderBranchBadge(meta.branch)}` : "";

    return `${model}${effort}${branch}`;
  }

  private renderEffortBadge(thinkingLevel: string): string {
    if (!thinkingLevel || thinkingLevel === "off") return "";

    return this.labelTheme.inverse(
      this.labelTheme.bold(
        this.labelTheme.fg(thinkingColor(thinkingLevel), ` ${thinkingLevel.toUpperCase()} `),
      ),
    );
  }

  private renderBranchBadge(branch: EditorBranchMeta): string {
    const color = branch.dirty ? "warning" : "success";
    const ahead = branch.ahead > 0 ? this.labelTheme.fg("success", ` ↑${branch.ahead}`) : "";
    const behind = branch.behind > 0 ? this.labelTheme.fg("error", ` ↓${branch.behind}`) : "";
    const dirty = branch.dirty ? this.labelTheme.fg("warning", " *") : "";

    return [
      this.labelTheme.fg(color, " "),
      this.labelTheme.bold(this.labelTheme.fg(color, branch.name)),
      dirty,
      ahead,
      behind,
    ].join("");
  }

  private renderContextMeter(meter: EditorContextMeter): string {
    const clampedPercent = Math.max(0, Math.min(100, meter.percent));
    const filledCells = Math.round((CONTEXT_METER_WIDTH * clampedPercent) / 100);
    const color = contextColor(meter.percent);
    const bar = Array.from({ length: CONTEXT_METER_WIDTH }, (_, index) => {
      const isFilled = index < filledCells;
      return this.labelTheme.fg(isFilled ? color : "borderMuted", isFilled ? "━" : "─");
    }).join("");

    return [
      this.labelTheme.fg("muted", "CTX"),
      this.labelTheme.fg("borderMuted", " "),
      bar,
      this.labelTheme.fg("borderMuted", " "),
      this.labelTheme.bold(this.labelTheme.fg("text", meter.label)),
    ].join("");
  }
}
