import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { CAPTION_FONT } from "../fonts";
import { useTheme } from "../ThemeContext";
import type { CaptionWord } from "../types";

const MAX_WORDS_PER_CHUNK = 3;

// Groups words into short chunks, breaking early after punctuation.
export const toChunks = (words: readonly CaptionWord[]): readonly (readonly CaptionWord[])[] =>
  words.reduce<readonly (readonly CaptionWord[])[]>((chunks, word) => {
    const last = chunks[chunks.length - 1];
    const lastWord = last?.[last.length - 1];
    const startNew = !last || last.length >= MAX_WORDS_PER_CHUNK || /[.,:;?!]$/.test(lastWord?.text ?? "");
    return startNew ? [...chunks, [word]] : [...chunks.slice(0, -1), [...last, word]];
  }, []);

type Props = { readonly words: readonly CaptionWord[]; readonly delayFrames: number };

// TikTok-style captions: one short chunk at a time, current word highlighted.
export const Captions = ({ words, delayFrames }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const t = (frame - delayFrames) / fps;
  const chunk = toChunks(words).find((c) => t >= c[0].start - 0.05 && t <= c[c.length - 1].end + 0.15);
  if (!chunk) return null;

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
        fontFamily: CAPTION_FONT,
        fontWeight: 800,
        fontSize: 60,
        lineHeight: 1.15,
        textTransform: "uppercase",
        transform: `scale(${0.85 + enter * 0.15})`,
      }}
    >
      {chunk.map((word, i) => {
        const active = t >= word.start && t < word.end + 0.05;
        return (
          <span
            key={`${word.start}-${i}`}
            style={{
              padding: "4px 14px",
              borderRadius: 14,
              color: active ? theme.onAccent : theme.ink,
              backgroundColor: active ? theme.accent : "transparent",
            }}
          >
            {word.text}
          </span>
        );
      })}
    </div>
  );
};
