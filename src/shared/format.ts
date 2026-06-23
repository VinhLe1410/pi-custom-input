export function roundedDisplayPercent(value: number, max = 999): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(max, Math.round(value)));
}
