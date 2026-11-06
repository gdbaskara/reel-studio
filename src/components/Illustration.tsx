import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import { bob } from "../life";
import type { Art } from "../types";

// Time to draw the whole picture, shared between its strokes.
const DRAW_FRAMES = 42;
// Filled areas sit a little under full strength so the ink lines stay the strongest mark.
const FILL_OPACITY = 0.85;

// Each stroke starts when the one before it finishes.
export const pathDelays = (count: number, start: number, total: number): readonly { delay: number; duration: number }[] => {
  const duration = total / Math.max(1, count);
  return Array.from({ length: count }, (_, i) => ({ delay: start + i * duration, duration }));
};

// The box around what was drawn, with room for the stroke on each side (6% of the longer side).
// Claude often draws small in a corner of its canvas; cropping makes every illustration fill its space.
const BOX_PADDING = 0.06;
export type Box = { readonly x: number; readonly y: number; readonly w: number; readonly h: number };
export const artBox = (paths: readonly string[], fills: readonly string[] = []): Box => {
  const numbers = [...paths, ...fills].flatMap((d) => (d.match(/-?\d*\.?\d+/g) ?? []).map(Number));
  const xs = numbers.filter((_, i) => i % 2 === 0);
  const ys = numbers.filter((_, i) => i % 2 === 1);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const pad = Math.max(maxX - minX, maxY - minY, 1) * BOX_PADDING;
  return { x: minX - pad, y: minY - pad, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad };
};

// The largest size that keeps the drawing's shape inside the room it has.
export const fitArt = (box: Box, maxWidth: number, maxHeight: number): { width: number; height: number } => {
  const scale = Math.min(maxWidth / box.w, maxHeight / box.h);
  return { width: Math.round(box.w * scale), height: Math.round(box.h * scale) };
};

type Props = { readonly art: Art; readonly delay: number; readonly width: number; readonly height: number };

// The step's illustration, drawn stroke by stroke like the doodles: a marker line on scribble looks,
// a thinner accent line on the clean ones. Once drawn it floats gently.
export const Illustration = ({ art, delay, width: maxWidth, height: maxHeight }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { decoration, palette } = useLook();
  const scribble = decoration === "scribble";
  const box = artBox(art.paths, art.fills);
  // The colour washes in once the lines are drawn, like a marker filling in a sketch.
  const fillIn = interpolate(frame, [delay + DRAW_FRAMES * 0.6, delay + DRAW_FRAMES + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const { width, height } = fitArt(box, maxWidth, maxHeight);
  // Stroke widths are in drawing units, so they are scaled to stay the same on screen.
  const stroke = ((scribble ? 11 : 8) * box.w) / width;
  const timings = pathDelays(art.paths.length, delay, DRAW_FRAMES);
  return (
    <div style={{ marginTop: 40, transform: `translateY(${bob(frame, delay + DRAW_FRAMES, fps)}px)` }}>
      <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} width={width} height={height} style={{ overflow: "visible" }}>
        {(art.fills ?? []).map((d, i) => (
          <path key={`fill-${i}`} d={d} fill={palette.highlight} stroke="none" opacity={fillIn * FILL_OPACITY} />
        ))}
        {art.paths.map((d, i) => {
          const progress = interpolate(frame, [timings[i].delay, timings[i].delay + timings[i].duration], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: Easing.inOut(Easing.cubic),
          });
          return (
            <path
              key={i}
              d={d}
              pathLength={1}
              fill="none"
              stroke={scribble ? palette.ink : palette.accent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={1}
              strokeDashoffset={1 - progress}
            />
          );
        })}
      </svg>
    </div>
  );
};
