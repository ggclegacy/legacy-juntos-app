import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/tokens.css", import.meta.url), "utf8");
const palette = Object.fromEntries([...css.matchAll(/--([\w-]+):\s*(#[\da-f]{6});/g)].map((m) => [m[1], m[2]]));
function luminance(hex: string) {
  const channels = [1, 3, 5].map((offset) => {
    const n = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const x = luminance(palette[a]), y = luminance(palette[b]);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}
describe("sanctuary contrast contract", () => {
  for (const surface of ["background-base", "surface-1", "surface-2", "surface-3", "emerald-deep", "emerald-primary", "selection-surface"]) {
    for (const text of ["text-primary", "text-secondary", "gold-primary"]) {
      it(`${text} on ${surface} meets AA for normal text`, () => expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5));
    }
    it(`focus ring on ${surface} meets non-text contrast`, () => expect(contrast("gold-bright", surface)).toBeGreaterThanOrEqual(3));
  }
  for (const gold of ["gold-bright", "gold-primary", "gold-muted"]) {
    it(`button text on ${gold} meets AA across metallic gradient`, () => expect(contrast("text-on-gold", gold)).toBeGreaterThanOrEqual(4.5));
  }
  for (const color of ["success", "chart-secondary", "error", "text-muted"]) {
    it(`${color} is readable on elevated obsidian`, () => expect(contrast(color, "surface-3")).toBeGreaterThanOrEqual(4.5));
  }
  it("input boundary has sufficient contrast", () => expect(contrast("border-control", "surface-1")).toBeGreaterThanOrEqual(3));
});
