import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { bob } from "../life";
import { useLook } from "../ThemeContext";
import type { Drawing } from "../types";
import { DRAWINGS, UNDERLINE } from "./drawings";
import { Scribble } from "./Scribble";

const grow = (frame: number, delay: number, duration: number) =>
  interpolate(frame, [delay, delay + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });

// Under the title: a marker scribble, or a clean bar that grows from the center.
export const TitleMark = ({ delay, align = "center" }: { readonly delay: number; readonly align?: "center" | "left" }) => {
  const frame = useCurrentFrame();
  const { decoration, palette } = useLook();
  if (decoration === "scribble") return <Scribble {...UNDERLINE} delay={delay} duration={22} strokeWidth={14} />;
  return <div style={{ width: 520 * grow(frame, delay, 18), height: 18, borderRadius: 9, backgroundColor: palette.accent, margin: align === "left" ? "24px 0 0" : "24px auto 0" }} />;
};

// Around the outro line: a marker circle, or a highlight band that sweeps in behind the text.
export const OutroMark = ({ delay }: { readonly delay: number }) => {
  const frame = useCurrentFrame();
  const { decoration, palette, markOpacity = 0.55 } = useLook();
  if (decoration === "scribble") return <Scribble {...DRAWINGS.circle} width={1120} delay={delay} duration={22} color={palette.accent} />;
  const t = grow(frame, delay, 16);
  return <div style={{ width: 980, height: "62%", backgroundColor: palette.highlight, opacity: markOpacity, transform: `scaleX(${t})`, borderRadius: 24 }} />;
};

// The doodle under a step: a marker stroke, or a thinner, even line in the accent color.
// Once drawn, it floats gently while the voice goes on.
export const Doodle = ({ drawing, delay }: { readonly drawing: Drawing; readonly delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { decoration, palette } = useLook();
  const draw = decoration === "scribble" ? 24 : 20;
  return (
    <div style={{ transform: `translateY(${bob(frame, delay + draw, fps)}px)` }}>
      {decoration === "scribble" ? (
        <Scribble {...DRAWINGS[drawing]} delay={delay} duration={draw} />
      ) : (
        <Scribble {...DRAWINGS[drawing]} width={DRAWINGS[drawing].width * 0.8} delay={delay} duration={draw} strokeWidth={7} color={palette.accent} />
      )}
    </div>
  );
};
