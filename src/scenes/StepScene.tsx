import { useLook } from "../ThemeContext";
import type { Step } from "../types";
import { FadeOut } from "../components/FadeOut";
import { Doodle } from "../components/Marks";
import { Note } from "../components/Note";
import { NumberBadge } from "../components/NumberBadge";
import { PopWords } from "../components/PopWords";
import { Wobble } from "../components/Wobble";

type Props = { readonly step: Step; readonly number: number; readonly duration: number };

export const StepScene = ({ step, number, duration }: Props) => {
  const { type, motion } = useLook();
  return (
    <FadeOut duration={duration}>
      <NumberBadge number={number} />
      <Wobble seed={`step-${number}`}>
        <PopWords text={step.title} fontSize={type.stepTitle} delay={motion.delays.stepTitle} />
      </Wobble>
      {step.note.trim() ? <Note text={step.note} delay={motion.delays.stepNote} /> : null}
      <div style={{ marginTop: 50 }}>
        <Doodle drawing={step.drawing} delay={motion.delays.stepDoodle} />
      </div>
    </FadeOut>
  );
};
