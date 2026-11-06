import { Fragment, type CSSProperties } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { NoteStyle } from "../looks/types";
import type { Palette } from "../types";
import { parseEmphasis } from "../looks/emphasis";
import { strongStyle } from "./PopWords";

const STYLES: Readonly<Record<NoteStyle, (p: Palette) => CSSProperties>> = {
  sticky: (p) => ({ padding: "30px 44px", backgroundColor: p.highlight, boxShadow: "8px 10px 0 rgba(0,0,0,0.15)" }),
  // The thin ink edge keeps the card visible when onAccent is as light as the paper.
  card: (p) => ({ padding: "34px 48px", backgroundColor: p.onAccent, color: p.ink, borderRadius: 28, border: `3px solid ${p.ink}22`, boxShadow: "0 18px 40px rgba(0,0,0,0.12)" }),
  // A fixed radius rather than a full pill, so a note that wraps to several lines keeps clear of the curve.
  pill: (p) => ({ padding: "22px 52px", border: `6px solid ${p.accent}`, color: p.ink, borderRadius: 56 }),
  plain: (p) => ({ padding: "10px 20px", color: p.ink, opacity: 0.8 }),
};

// side is 1 for the right and -1 for the left.
const enter = (from: "right" | "bottom" | "fade", t: number, side: number) =>
  from === "right" ? `translateX(${(1 - t) * 700 * side}px)` : from === "bottom" ? `translateY(${(1 - t) * 160}px)` : "";

// The short detail under a step title. Text without *emphasis* is drawn exactly as typed.
// flip mirrors the tilt and the side it slides in from, so neighbouring steps do not look alike.
type NoteProps = { readonly text: string; readonly delay: number; readonly align?: "center" | "left"; readonly flip?: boolean };

export const Note = ({ text, delay, align = "center", flip = false }: NoteProps) => {
  const side = flip ? -1 : 1;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const look = useLook();
  const { motion, type, palette } = look;
  const slide = spring({ frame: frame - delay, fps, config: motion.note });
  return (
    <div
      style={{
        marginTop: 50,
        maxWidth: 860,
        fontSize: type.note,
        lineHeight: 1.1,
        textAlign: align,
        ...STYLES[look.note](palette),
        opacity: look.note === "plain" ? 0.8 * slide : slide,
        transform: `${enter(motion.noteFrom, slide, side)} rotate(${motion.noteTilt * side}deg)`.trim(),
      }}
    >
      {text.includes("*")
        ? parseEmphasis(text).map((word, i) => (
            <Fragment key={`${word.text}-${i}`}>
              {i > 0 ? " " : ""}
              <span style={word.strong ? strongStyle(look, undefined, type.note) : undefined}>{word.text}</span>
            </Fragment>
          ))
        : text}
    </div>
  );
};
