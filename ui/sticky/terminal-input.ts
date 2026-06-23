import { isKeyRelease, matchesKey, type KeyId } from "@earendil-works/pi-tui";
import { matchesConfiguredShortcut } from "./shortcuts";

export interface KeyboardScrollShortcuts {
  up: KeyId;
  down: KeyId;
}

export interface SgrMousePacket {
  code: number;
  col: number;
  row: number;
  final: "M" | "m";
}

export const DEFAULT_KEYBOARD_SCROLL_SHORTCUTS: KeyboardScrollShortcuts = {
  up: "super+up",
  down: "super+down",
};

export function parseKeyboardScrollDelta(
  data: string,
  shortcuts: KeyboardScrollShortcuts = DEFAULT_KEYBOARD_SCROLL_SHORTCUTS,
): number {
  if (isKeyRelease(data)) return 0;

  if (
    matchesConfiguredShortcut(data, shortcuts.up)
    || matchesKey(data, "pageUp")
    || matchesKey(data, "ctrl+shift+up")
    || /^\x1b\[(?:5;9(?::[12])?~|1;6(?::[12])?A|57421;9(?::[12])?u|57419;6(?::[12])?u)$/.test(data)
  ) return 10;
  if (
    matchesConfiguredShortcut(data, shortcuts.down)
    || matchesKey(data, "pageDown")
    || matchesKey(data, "ctrl+shift+down")
    || /^\x1b\[(?:6;9(?::[12])?~|1;6(?::[12])?B|57422;9(?::[12])?u|57420;6(?::[12])?u)$/.test(data)
  ) return -10;
  return 0;
}

export function parseSgrMousePackets(data: string): SgrMousePacket[] | null {
  const pattern = /\x1b\[<(\d+);(\d+);(\d+)([Mm])/g;
  const packets: SgrMousePacket[] = [];
  let offset = 0;

  for (const match of data.matchAll(pattern)) {
    if (match.index !== offset) return null;
    offset = match.index + match[0].length;
    packets.push({
      code: Number(match[1]),
      col: Number(match[2]),
      row: Number(match[3]),
      final: match[4] === "m" ? "m" : "M",
    });
  }

  return packets.length > 0 && offset === data.length ? packets : null;
}

function mouseBaseButton(code: number): number {
  return code & ~(4 | 8 | 16 | 32);
}

export function mouseScrollDelta(packet: SgrMousePacket): number {
  if (packet.final !== "M") return 0;
  const baseButton = mouseBaseButton(packet.code);
  if (baseButton === 64) return 3;
  if (baseButton === 65) return -3;
  return 0;
}

export function isLeftPress(packet: SgrMousePacket): boolean {
  return packet.final === "M" && mouseBaseButton(packet.code) === 0 && (packet.code & 32) === 0;
}

export function isLeftDrag(packet: SgrMousePacket): boolean {
  return packet.final === "M" && mouseBaseButton(packet.code) === 0 && (packet.code & 32) !== 0;
}

export function isRightPress(packet: SgrMousePacket): boolean {
  return packet.final === "M" && mouseBaseButton(packet.code) === 2 && (packet.code & 32) === 0;
}

export function isMouseRelease(packet: SgrMousePacket): boolean {
  return packet.final === "m";
}
