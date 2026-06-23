import type { InputStyle } from "../../core/input-style-config";
import type { InputStyleAdapter } from "./types";
import { ampStyle } from "./amp-style";
import { defaultStyle } from "./default-style";

export const inputStyleAdapters: readonly InputStyleAdapter[] = [
  defaultStyle,
  ampStyle,
];

export function findInputStyleAdapter(
  id: InputStyle,
): InputStyleAdapter | undefined {
  return inputStyleAdapters.find((adapter) => adapter.id === id);
}

export type { InputStyleAdapter, InputStyleRuntime } from "./types";
