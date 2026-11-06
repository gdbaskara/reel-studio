import type { Plan } from "./project";
import type { StepLayout } from "../../src/types";

// A new reel alternates centered and left steps so neighbouring steps never look alike,
// and ends on the big number so the last step lands as the high point.
export const rhythmLayouts = (count: number): readonly StepLayout[] =>
  Array.from({ length: count }, (_, i): StepLayout => (count >= 3 && i === count - 1 ? "big-number" : i % 2 === 0 ? "center" : "left"));

// Fills in layouts a plan leaves out; a layout the plan already names is kept.
export const withRhythm = (plan: Plan): Plan => {
  const layouts = rhythmLayouts(plan.steps.length);
  return { ...plan, steps: plan.steps.map((step, i) => (step.layout ? step : { ...step, layout: layouts[i] })) };
};
