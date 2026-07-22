# Pi Custom Input

Custom user input styling and customization for Pi Coding Agent. Has the option to select an Amp-inspired input styling, as well as the ability to pin the user input to the bottom of the terminal.

https://github.com/user-attachments/assets/d05d8ce4-130b-463b-b0ec-68ecd6425ac1

## Feature list

1. **Amp-inspired input:** Minimal frame with an active-agent timer, Git state, cost, model, thinking level, context usage, cwd, and bash-mode feedback.
2. **Default input:** Use an extension-owned editor matching Pi's standard input appearance.
3. **Sticky input:** On supported Pi/TUI versions, pins status, widgets, editor, and footer to the bottom while the transcript scrolls. Use the mouse wheel or PageUp/PageDown to scroll and Ctrl+End to jump to the latest output. Mouse dragging selects and automatically copies transcript or dock text; double-click selects a whole line. Dragging at transcript edges extends the selection while scrolling. Right-click inside a selection preserves it for the terminal context menu.
4. **Settings:** Use `/input-style` to select a style and toggle sticky input. Settings are saved to `~/.pi/agent/pi-custom-input.json`.

## Code layout

The root `index.ts` is a tiny compatibility shim. The extension implementation lives in [`src/`](src/):

- [`src/default/`](src/default/) implements Pi's standard-looking editor.
- [`src/amp/`](src/amp/) contains the Amp-inspired input.
- [`src/shared/`](src/shared/) contains shared input utilities.
- [`src/settings/`](src/settings/) contains the style picker and preview frame.
- [`src/sticky/`](src/sticky/) contains the viewport, scrolling model, and Pi root-layout adapter.

**How to use:** Clone into `~/.pi/agent/extensions/`, run `pnpm install` for development tooling, then use `/reload` in Pi.
