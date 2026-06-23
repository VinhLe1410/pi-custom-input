import type { ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { type SelectItem, SelectList } from "@earendil-works/pi-tui";
import { isInputStyle, type InputStyle } from "../core/input-style-config";
import { findInputStyleAdapter, inputStyleAdapters } from "./input-styles";
import { renderSettingsFocusFrame } from "./settings-frame";

function selectListTheme(theme: Theme) {
  return {
    selectedPrefix: (text: string) => theme.fg("accent", text),
    selectedText: (text: string) => theme.fg("accent", theme.bold(text)),
    description: (text: string) => theme.fg("muted", text),
    scrollInfo: (text: string) => theme.fg("dim", text),
    noMatch: (text: string) => theme.fg("warning", text),
  };
}

function styleItems(currentStyle: InputStyle): SelectItem[] {
  return inputStyleAdapters.map((adapter) => ({
    value: adapter.id,
    label: adapter.id === currentStyle ? `${adapter.label} (current)` : adapter.label,
    description: adapter.description,
  }));
}

export async function showInputStyleMenu(
  ctx: ExtensionContext,
  currentStyle: InputStyle,
): Promise<InputStyle | undefined> {
  return ctx.ui.custom<InputStyle | undefined>((tui, theme, _keybindings, done) => {
    let previewStyle = currentStyle;
    const selectList = new SelectList(
      styleItems(currentStyle),
      inputStyleAdapters.length,
      selectListTheme(theme),
      { minPrimaryColumnWidth: 18, maxPrimaryColumnWidth: 28 },
    );

    const initialIndex = inputStyleAdapters.findIndex((a) => a.id === currentStyle);
    selectList.setSelectedIndex(initialIndex >= 0 ? initialIndex : 0);
    selectList.onSelectionChange = (item) => {
      if (isInputStyle(item.value)) previewStyle = item.value;
      tui.requestRender();
    };
    selectList.onSelect = (item) => {
      done(isInputStyle(item.value) ? item.value : undefined);
    };
    selectList.onCancel = () => done(undefined);

    return {
      render(width: number): string[] {
        const adapter = findInputStyleAdapter(previewStyle);
        const preview = adapter
          ? adapter.renderPreview(ctx, width, theme)
          : [];
        const lines = [
          theme.fg("accent", theme.bold("Input Style")),
          "",
          ...selectList.render(width),
          "",
          ...preview,
          "",
          theme.fg("dim", "↑↓ preview • enter select • esc cancel"),
        ];
        return renderSettingsFocusFrame(lines, width, theme);
      },
      invalidate(): void {
        selectList.invalidate();
      },
      handleInput(data: string): void {
        selectList.handleInput(data);
        tui.requestRender();
      },
    };
  });
}
