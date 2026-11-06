import type { CSSProperties } from "react";
import { AbsoluteFill, Img, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { BackgroundKind } from "../looks/types";
import type { Backdrop, Palette, Step } from "../types";
import { DRAWINGS } from "./drawings";
import { artBox } from "./Illustration";
import { MOTIF_CELL, motifTiles } from "../motif";

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

const Pattern = ({ kind }: { readonly kind: Exclude<BackgroundKind, "flat"> }) => <AbsoluteFill style={PATTERNS[kind](useLook().palette)} />;

// The reel's own topic drawings, small and faint, drifting slowly upward behind every scene.
const MOTIF_SIZE = 190;
// Faint enough that text drawn over it keeps its contrast.
const MOTIF_OPACITY = 0.08;
const DRIFT_PX_PER_FRAME = 0.5;
const Motif = ({ steps }: { readonly steps: readonly Step[] }) => {
  const frame = useCurrentFrame();
  const { palette } = useLook();
  // Each step's illustration, else its doodle, so a reel without illustrations still gets a motif.
  const drawings = steps.map((step) => {
    if (step.art) {
      const box = artBox(step.art.paths, step.art.fills);
      return { viewBox: `${box.x} ${box.y} ${box.w} ${box.h}`, paths: step.art.paths, unit: box.w };
    }
    const shape = DRAWINGS[step.drawing];
    return { viewBox: shape.viewBox, paths: [shape.path], unit: Number(shape.viewBox.split(" ")[2]) };
  });
  const shift = (frame * DRIFT_PX_PER_FRAME) % (MOTIF_CELL * 2);
  return (
    <AbsoluteFill style={{ transform: `translateY(${-shift}px)` }}>
      {motifTiles(drawings.length).map((tile, i) => {
        const drawing = drawings[tile.index];
        return (
          <svg
            key={i}
            viewBox={drawing.viewBox}
            width={MOTIF_SIZE}
            height={MOTIF_SIZE}
            style={{ position: "absolute", left: tile.x - MOTIF_SIZE / 2, top: tile.y - MOTIF_SIZE / 2, transform: `rotate(${tile.rotate}deg)`, opacity: MOTIF_OPACITY, overflow: "visible" }}
          >
            {drawing.paths.map((d, j) => (
              <path key={j} d={d} fill="none" stroke={palette.ink} strokeWidth={(6 * drawing.unit) / MOTIF_SIZE} strokeLinecap="round" strokeLinejoin="round" />
            ))}
          </svg>
        );
      })}
    </AbsoluteFill>
  );
};

// An uploaded picture, filling the frame and zooming in slowly, under a layer of the paper
// colour so the scene's text stays readable on top.
const Picture = ({ backdrop }: { readonly backdrop: Extract<Backdrop, { kind: "image" }> }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const { palette } = useLook();
  const zoom = 1 + 0.06 * Math.min(1, frame / Math.max(1, durationInFrames));
  return (
    <AbsoluteFill>
      <Img src={backdrop.image.src} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
      <AbsoluteFill style={{ backgroundColor: palette.paper, opacity: backdrop.dim }} />
    </AbsoluteFill>
  );
};

type Props = { readonly backdrop?: Backdrop; readonly steps: readonly Step[] };

// The paper behind every scene: the look's own pattern unless the reel picks another backdrop.
// A flat look with no backdrop draws nothing extra, so those reels render exactly as before.
export const Background = ({ backdrop, steps }: Props) => {
  const { background } = useLook();
  if (!backdrop || backdrop.kind === "look") return background === "flat" ? null : <Pattern kind={background} />;
  switch (backdrop.kind) {
    case "pattern":
      return <Pattern kind={backdrop.pattern} />;
    case "motif":
      return <Motif steps={steps} />;
    case "image":
      return <Picture backdrop={backdrop} />;
  }
};
