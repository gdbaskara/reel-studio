import type { CSSProperties } from "react";
import { AbsoluteFill } from "remotion";
import { useLook } from "../ThemeContext";
import type { BackgroundKind } from "../looks/types";
import type { Palette } from "../types";

// Hex color with an alpha (0..1), for faint pattern lines drawn in the ink color.
const tint = (hex: string, alpha: number) =>
  `${hex}${Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0")}`;

const PATTERNS: Readonly<Record<Exclude<BackgroundKind, "flat">, (p: Palette) => CSSProperties>> = {
  dots: (p) => ({ backgroundImage: `radial-gradient(${tint(p.ink, 0.14)} 3px, transparent 3.5px)`, backgroundSize: "48px 48px" }),
  grid: (p) => ({
    backgroundImage: `linear-gradient(${tint(p.ink, 0.08)} 2px, transparent 2px), linear-gradient(90deg, ${tint(p.ink, 0.08)} 2px, transparent 2px)`,
    backgroundSize: "72px 72px",
  }),
  lines: (p) => ({ backgroundImage: `linear-gradient(${tint(p.ink, 0.1)} 2px, transparent 2px)`, backgroundSize: "100% 84px" }),
  gradient: (p) => ({ backgroundImage: `radial-gradient(120% 70% at 50% 0%, ${tint(p.accent, 0.28)}, transparent 70%), radial-gradient(90% 60% at 50% 100%, ${tint(p.highlight, 0.22)}, transparent 70%)` }),
  grain: (p) => ({
    backgroundImage: `radial-gradient(${tint(p.ink, 0.06)} 1px, transparent 1.5px), radial-gradient(${tint(p.ink, 0.05)} 1px, transparent 1.5px)`,
    backgroundSize: "7px 7px, 11px 11px",
    backgroundPosition: "0 0, 3px 5px",
  }),
};

// The paper behind every scene. "flat" is a plain fill, the others add a static pattern.
export const Background = () => {
  const { background, palette } = useLook();
  return (
    <AbsoluteFill style={{ backgroundColor: palette.paper }}>
      {background === "flat" ? null : <AbsoluteFill style={PATTERNS[background](palette)} />}
    </AbsoluteFill>
  );
};
