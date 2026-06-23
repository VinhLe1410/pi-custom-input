/* eslint-disable @typescript-eslint/consistent-type-assertions */

import {
  isStickyRenderable,
  type StickyRenderable,
  type StickySlots,
  type StickyTuiLike,
} from "./types";

interface ChildContainer {
  children?: unknown[];
}

function tuiChildren(tui: StickyTuiLike): unknown[] {
  return Array.isArray(tui.children) ? tui.children : [];
}

function containerChildren(candidate: unknown): unknown[] {
  if (candidate == null || typeof candidate !== "object") return [];
  const children = (candidate as ChildContainer).children;
  return Array.isArray(children) ? children : [];
}

function findContainerIndex(tui: StickyTuiLike, renderable: unknown): number {
  return tuiChildren(tui).findIndex((candidate) => containerChildren(candidate).includes(renderable));
}

function looksLikeEditorRenderable(candidate: unknown): boolean {
  if (candidate == null || typeof candidate !== "object") return false;
  const value = candidate as { handleInput?: unknown; render?: unknown };
  return typeof value.handleInput === "function" && typeof value.render === "function";
}

function findEditorContainerIndex(tui: StickyTuiLike): number {
  return tuiChildren(tui).findIndex((candidate) =>
    containerChildren(candidate).some((child) => looksLikeEditorRenderable(child)),
  );
}

function renderableAt(children: unknown[], index: number): StickyRenderable | null {
  const candidate = children[index];
  return isStickyRenderable(candidate) ? candidate : null;
}

export function discoverStickySlots(
  tui: StickyTuiLike,
  capturedEditor: unknown,
): StickySlots | null {
  const children = tuiChildren(tui);
  const editorIndex = capturedEditor !== null
    ? findContainerIndex(tui, capturedEditor)
    : findEditorContainerIndex(tui);

  if (editorIndex === -1) return null;

  const editor = renderableAt(children, editorIndex);
  if (!editor) return null;

  return {
    status: editorIndex >= 2 ? renderableAt(children, editorIndex - 2) : null,
    widgetAbove: editorIndex >= 1 ? renderableAt(children, editorIndex - 1) : null,
    editor,
    widgetBelow: renderableAt(children, editorIndex + 1),
    footer: renderableAt(children, editorIndex + 2),
  };
}
