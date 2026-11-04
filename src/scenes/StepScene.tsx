import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { Step } from "../types";
import { FadeOut } from "../components/FadeOut";
import { Doodle } from "../components/Marks";
import { Note } from "../components/Note";
import { NumberBadge } from "../components/NumberBadge";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";

type Props = { readonly step: Step; readonly number: number; readonly duration: number };

// The original layout: badge, title, note and doodle stacked in the middle.
const Center = ({ step, number }: Omit<Props, "duration">) => {
  const { type, motion } = useLook();
  return (
    <>
      <NumberBadge number={number} />
      <Wobble seed={`step-${number}`}>
        <PopWords text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} />
      </Wobble>
      {step.note.trim() ? <Note text={step.note} delay={motion.delays.stepNote} /> : null}
      <div style={{ marginTop: 50 }}>
        <Doodle drawing={step.drawing} delay={motion.delays.stepDoodle} />
      </div>
    </>
  );
};

// Everything lined up on the left edge, like a slide.
const Left = ({ step, number }: Omit<Props, "duration">) => {
  const { type, motion } = useLook();
  return (
    <div style={{ alignSelf: "stretch", display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <NumberBadge number={number} />
      <Wobble seed={`step-${number}`}>
        <PopWords text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} align="left" />
      </Wobble>
      {step.note.trim() ? <Note text={step.note} delay={motion.delays.stepNote} align="left" /> : null}
      <div style={{ marginTop: 50 }}>
        <Doodle drawing={step.drawing} delay={motion.delays.stepDoodle} />
      </div>
    </div>
  );
};

const BIG_NUMBER_SIZE = 460;

// A large step number leads, with the title right under it and no badge.
const BigNumber = ({ step, number }: Omit<Props, "duration">) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { type, motion, palette, fonts } = useLook();
  const pop = spring({ frame, fps, config: motion.badge });
  return (
    <>
      <div
        style={{
          fontSize: BIG_NUMBER_SIZE,
          lineHeight: 1,
          marginBottom: 30,
          color: palette.accent,
          ...(fonts.displayWeight !== 400 ? { fontWeight: fonts.displayWeight } : {}),
          opacity: pop,
          transform: `translateY(${(1 - pop) * 80}px)`,
        }}
      >
        {String(number).padStart(2, "0")}
      </div>
      <Wobble seed={`step-${number}`}>
        <PopWords text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} />
      </Wobble>
      {step.note.trim() ? <Note text={step.note} delay={motion.delays.stepNote} /> : null}
    </>
  );
};

const LAYOUTS = { center: Center, left: Left, "big-number": BigNumber } as const;

export const StepScene = ({ step, number, duration }: Props) => {
  const Layout = LAYOUTS[step.layout ?? "center"];
  return (
    <FadeOut duration={duration}>
      <Layout step={step} number={number} />
    </FadeOut>
  );
};
