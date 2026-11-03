import { spring, useCurrentFrame, useVideoConfig } from "remotion";

type Props = {
  readonly text: string;
  readonly delay?: number;
  readonly stagger?: number;
  readonly fontSize: number;
  readonly color?: string;
};

// Each word springs up and in, one after another, like it is being said.
export const PopWords = ({ text, delay = 0, stagger = 4, fontSize, color }: Props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(" ");

  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", fontSize, color, lineHeight: 1.05 }}>
      {words.map((word, i) => {
        const progress = spring({ frame: frame - delay - i * stagger, fps, config: { damping: 12, stiffness: 160 } });
        return (
          <span
            key={`${word}-${i}`}
            style={{
              display: "inline-block",
              marginRight: fontSize * 0.25,
              opacity: Math.min(progress * 1.5, 1),
              transform: `translateY(${(1 - progress) * 50}px) scale(${0.6 + progress * 0.4})`,
            }}
          >
            {word}
          </span>
        );
      })}
    </div>
  );
};
