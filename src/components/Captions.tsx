import type { CSSProperties } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import { stripMarkers } from "../looks/emphasis";
import type { CaptionStyle } from "../looks/types";
import type { CaptionWord, Palette } from "../types";

const MAX_WORDS_PER_CHUNK = 3;

// Groups words into short chunks, breaking early after punctuation.
export const toChunks = (words: readonly CaptionWord[]): readonly (readonly CaptionWord[])[] =>
  words.reduce<readonly (readonly CaptionWord[])[]>((chunks, word) => {
    const last = chunks[chunks.length - 1];
    const lastWord = last?.[last.length - 1];
    const startNew = !last || last.length >= MAX_WORDS_PER_CHUNK || /[.,:;?!]$/.test(lastWord?.text ?? "");
    return startNew ? [...chunks, [word]] : [...chunks.slice(0, -1), [...last, word]];
  }, []);

// Per caption style: an optional box behind the whole line, and each word when active or not.
type Skin = {
  readonly line?: (p: Palette) => CSSProperties;
  readonly word: (p: Palette, active: boolean) => CSSProperties;
};

const OUTLINE = "#111111";
const SKINS: Readonly<Record<CaptionStyle, Skin>> = {
  pill: {
    word: (p, active) => ({ padding: "4px 14px", borderRadius: 14, color: active ? p.onAccent : p.ink, backgroundColor: active ? p.accent : "transparent" }),
  },
  outline: {
    word: (p, active) => ({
      padding: "4px 6px",
      color: active ? p.highlight : "#FFFFFF",
      WebkitTextStroke: `10px ${OUTLINE}`,
      paintOrder: "stroke fill",
      textShadow: `0 6px 0 ${OUTLINE}`,
      transform: active ? "scale(1.08)" : undefined,
    }),
  },
  box: {
    line: (p) => ({ backgroundColor: p.ink, borderRadius: 22, padding: "14px 22px" }),
    word: (p, active) => ({ padding: "2px 8px", color: active ? p.highlight : p.paper }),
  },
  minimal: {
    word: (p, active) => ({
      padding: "4px 6px",
      color: p.ink,
      textDecoration: active ? "underline" : "none",
      textDecorationColor: p.accent,
      textDecorationThickness: 8,
      textUnderlineOffset: 12,
      opacity: active ? 1 : 0.75,
    }),
  },
};

type Props = { readonly words: readonly CaptionWord[]; readonly delayFrames: number };

// TikTok-style captions: one short chunk at a time, current word highlighted in the look's caption style.
export const Captions = ({ words, delayFrames }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const look = useLook();
  const { palette } = look;
  const skin = SKINS[look.captions];
  const t = (frame - delayFrames) / fps;
  const chunk = toChunks(words).find((c) => t >= c[0].start - 0.05 && t <= c[c.length - 1].end + 0.15);
  if (!chunk) return null;

  // Marker asterisks from *emphasis* are hidden; a word made only of markers is skipped.
  const spans = chunk.flatMap((word, i) => {
    const text = stripMarkers(word.text);
    if (!text) return [];
    const active = t >= word.start && t < word.end + 0.05;
    return [
      <span key={`${word.start}-${i}`} style={skin.word(palette, active)}>
        {text}
      </span>,
    ];
  });
  const enter = spring({ frame: frame - delayFrames - Math.round(chunk[0].start * fps), fps, config: { damping: 14, stiffness: 220 } });

  return (
    <div
      style={{
        position: "absolute",
        left: 60,
        right: 60,
        bottom: 380,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: "6px 18px",
        fontFamily: look.fonts.caption,
        fontWeight: look.fonts.captionWeight,
        fontSize: 60,
        lineHeight: 1.15,
        textTransform: look.captions === "minimal" ? "none" : "uppercase",
        transform: `scale(${0.85 + enter * 0.15})`,
      }}
    >
      {skin.line ? (
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "6px 18px", ...skin.line(palette) }}>{spans}</div>
      ) : (
        spans
      )}
    </div>
  );
};
