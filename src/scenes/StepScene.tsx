import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useTheme } from "../ThemeContext";
import type { Step } from "../types";
import { FadeOut } from "../components/FadeOut";
import { PopWords } from "../components/PopWords";
import { Scribble } from "../components/Scribble";
import { Wobble } from "../components/Wobble";
import { DRAWINGS } from "../components/drawings";

const NumberBadge = ({ number }: { readonly number: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const pop = spring({ frame, fps, config: { damping: 9, stiffness: 180 } });
  return (
    <div
      style={{
        width: 200,
        height: 200,
        borderRadius: "50%",
        backgroundColor: theme.accent,
        color: theme.onAccent,
        fontSize: 150,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${pop}) rotate(${(1 - pop) * -40}deg)`,
        marginBottom: 40,
      }}
    >
      {number}
    </div>
  );
};

const StickyNote = ({ text, delay }: { readonly text: string; readonly delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const theme = useTheme();
  const slide = spring({ frame: frame - delay, fps, config: { damping: 14 } });
  return (
    <div
      style={{
        marginTop: 50,
        padding: "30px 44px",
        maxWidth: 860,
        backgroundColor: theme.highlight,
        fontSize: 70,
        lineHeight: 1.1,
        textAlign: "center",
        boxShadow: "8px 10px 0 rgba(0,0,0,0.15)",
        opacity: slide,
        transform: `translateX(${(1 - slide) * 700}px) rotate(-2.5deg)`,
      }}
    >
      {text}
    </div>
  );
};

type Props = { readonly step: Step; readonly number: number; readonly duration: number };

export const StepScene = ({ step, number, duration }: Props) => (
  <FadeOut duration={duration}>
    <NumberBadge number={number} />
    <Wobble seed={`step-${number}`}>
      <PopWords text={step.title} fontSize={140} delay={8} />
    </Wobble>
    <StickyNote text={step.note} delay={45} />
    <div style={{ marginTop: 50 }}>
      <Scribble {...DRAWINGS[step.drawing]} delay={70} duration={24} />
    </div>
  </FadeOut>
);
