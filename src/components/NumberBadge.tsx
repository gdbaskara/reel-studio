import type { CSSProperties } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { BadgeStyle } from "../looks/types";
import type { Palette } from "../types";

const SHAPES: Readonly<Record<BadgeStyle, (p: Palette) => CSSProperties>> = {
  circle: (p) => ({ width: 200, height: 200, borderRadius: "50%", backgroundColor: p.accent, color: p.onAccent }),
  square: (p) => ({ width: 200, height: 200, borderRadius: 36, backgroundColor: p.accent, color: p.onAccent }),
  ring: (p) => ({ width: 200, height: 200, borderRadius: "50%", border: `12px solid ${p.accent}`, color: p.accent, boxSizing: "border-box" }),
  numeral: (p) => ({ height: 200, color: p.accent }),
};

// The step number above each step title, popping in with a spin.
export const NumberBadge = ({ number }: { readonly number: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { badge, motion, palette, type, fonts } = useLook();
  const pop = spring({ frame, fps, config: motion.badge });
  return (
    <div
      style={{
        ...SHAPES[badge](palette),
        fontSize: type.badge,
        ...(fonts.displayWeight !== 400 ? { fontWeight: fonts.displayWeight } : {}),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pop}) rotate(${(1 - pop) * motion.badgeSpin}deg)`,
        marginBottom: 40,
      }}
    >
      {badge === "numeral" ? String(number).padStart(2, "0") : number}
    </div>
  );
};
