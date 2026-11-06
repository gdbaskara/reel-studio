import type { ReactNode } from "react";
import { spring, useCurrentFrame, useVideoConfig } from "remotion";
import { useLook } from "../ThemeContext";
import type { Step } from "../types";
import { FadeOut } from "../components/FadeOut";
import { Doodle } from "../components/Marks";
import { Note } from "../components/Note";
import { NumberBadge } from "../components/NumberBadge";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";
import { StepImage } from "../components/StepImage";
import { Illustration } from "../components/Illustration";
import { CONTENT_BOTTOM, useContentTop } from "../layout";

type Props = { readonly step: Step; readonly number: number; readonly duration: number };

// The illustration is the scene's focal point, so it gets as much room as the text leaves:
// wide drawings use the width, tall ones the height. Next to a big number it gets less height.
const ART_WIDTH = 640;
const ART_HEIGHT = 420;
const ART_HEIGHT_BIG_NUMBER = 320;

// Under the text: the step's illustration, else its doodle. A step with a picture shows neither.
const StepVisual = ({ step, width }: { readonly step: Step; readonly width: number }) => {
  const { motion } = useLook();
  if (step.image) return null;
  if (step.art) return <Illustration art={step.art} delay={motion.delays.stepDoodle} width={width} height={ART_HEIGHT} />;
  return (
    <div style={{ marginTop: 50 }}>
      <Doodle drawing={step.drawing} delay={motion.delays.stepDoodle} />
    </div>
  );
};

// The original layout: badge, title, note and doodle stacked in the middle.
const Center = ({ step, number }: Omit<Props, "duration">) => {
  const { type, motion } = useLook();
  return (
    <>
      <NumberBadge number={number} />
      <Wobble seed={`step-${number}`}>
        <PopWords edit={`step-${number}:title`} text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} />
      </Wobble>
      {step.image ? <StepImage image={step.image} delay={motion.delays.stepNote} /> : null}
      {step.note.trim() ? <Note edit={`step-${number}:note`} text={step.note} delay={motion.delays.stepNote} flip={number % 2 === 0} /> : null}
      <StepVisual step={step} width={ART_WIDTH} />
    </>
  );
};

// Everything lined up on the left edge, like a slide.
const Left = ({ step, number }: Omit<Props, "duration">) => {
  const { type, motion } = useLook();
  return (
    <div style={{ alignSelf: "stretch", flex: "1 1 auto", minHeight: 0, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
      <NumberBadge number={number} />
      <Wobble seed={`step-${number}`}>
        <PopWords edit={`step-${number}:title`} text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} align="left" />
      </Wobble>
      {step.image ? <StepImage image={step.image} delay={motion.delays.stepNote} align="left" /> : null}
      {step.note.trim() ? <Note edit={`step-${number}:note`} text={step.note} delay={motion.delays.stepNote} align="left" flip={number % 2 === 0} /> : null}
      <StepVisual step={step} width={ART_WIDTH} />
    </div>
  );
};

const BIG_NUMBER_SIZE = 460;
// With a picture the number shrinks so the picture, note and captions still fit.
const BIG_NUMBER_WITH_IMAGE = 260;

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
          fontSize: step.image || step.art ? BIG_NUMBER_WITH_IMAGE : BIG_NUMBER_SIZE,
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
        <PopWords edit={`step-${number}:title`} text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} />
      </Wobble>
      {step.image ? <StepImage image={step.image} delay={motion.delays.stepNote} /> : null}
      {step.note.trim() ? <Note edit={`step-${number}:note`} text={step.note} delay={motion.delays.stepNote} flip={number % 2 === 0} /> : null}
      {step.art && !step.image ? <Illustration art={step.art} delay={motion.delays.stepDoodle} width={ART_WIDTH} height={ART_HEIGHT_BIG_NUMBER} /> : null}
    </>
  );
};

const LAYOUTS = { center: Center, left: Left, "big-number": BigNumber } as const;

// With a picture, the scene is held to the space above the captions and the picture takes what is left.
const Fitted = ({ children }: { readonly children: ReactNode }) => {
  const top = useContentTop();
  return <div style={{ height: CONTENT_BOTTOM - top, display: "flex", flexDirection: "column", alignItems: "center", alignSelf: "stretch" }}>{children}</div>;
};

export const StepScene = ({ step, number, duration }: Props) => {
  const Layout = LAYOUTS[step.layout ?? "center"];
  return (
    <FadeOut duration={duration}>
      {step.image ? (
        <Fitted>
          <Layout step={step} number={number} />
        </Fitted>
      ) : (
        <Layout step={step} number={number} />
      )}
    </FadeOut>
  );
};
