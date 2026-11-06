import { ArtSchema, type Plan } from "../shared/project";
import { askClaude, extractJson } from "./planner";

// narration is what the voice says over the step; it gives Claude more to picture than the short title.
type StepText = Pick<Plan["steps"][number], "title" | "note"> & { readonly narration?: string };
export type Art = ReturnType<typeof ArtSchema.parse>;

const describe = (step: StepText) =>
  [step.title.trim(), step.note.trim(), step.narration?.trim().slice(0, 200) ?? ""].filter(Boolean).join(". ").replaceAll('"', "'");

// One request draws every step, so a reel waits for Claude once rather than once per step.
export const illustrationPrompt = (topic: string, steps: readonly StepText[]) => `You are an illustrator drawing spot illustrations for a vertical explainer video, in a bold hand-drawn editorial style.
Topic of the video: """${topic.slice(0, 400)}"""

Draw ONE picture for each step below. Show the concrete thing the step is about: the objects, hands, people, tools or scene a viewer would recognise for this topic. Never an abstract symbol like a star, check mark or arrow.
${JSON.stringify(Object.fromEntries(steps.map((s, i) => [`step-${i + 1}`, describe(s)])), null, 2)}

Make the set varied. Each step uses a different main subject and a different composition: for example a close-up of one object, a hand doing the action, a person, a small scene from above, a before-and-after pair. Never draw the same object or the same arrangement twice.

Rules for every picture:
- Canvas viewBox "0 0 400 400". Keep every point between 20 and 380, centred, filling most of the canvas.
- "paths": 5 to 12 SVG path "d" strings for the lines. Give it a clear silhouette plus a few details that make it recognisable, and one or two small action marks (motion lines, a spark of impact) where they help.
- "fills": 1 to 5 closed shapes (ending in Z) for the main surfaces to colour in, such as the body of an object or a highlighted area. They sit behind the lines in one accent colour, so pick the shapes that make the picture pop.
- Use only the commands M, L, C, Q and Z with absolute coordinates.
- No words or letters. Simple marks such as dots or lines on an object are fine.

Return ONLY a JSON object, no prose and no code fences, shaped like:
{ "step-1": { "paths": ["M ...", "M ..."], "fills": ["M ... Z"] }, "step-2": { "paths": [...], "fills": [...] } }`;

// Keeps each step's drawing that passes the schema; a bad or missing drawing just leaves that step without one.
export const parseIllustrations = (raw: string, stepCount: number): Readonly<Record<number, Art>> => {
  const json = extractJson(raw) as Record<string, unknown>;
  return Object.fromEntries(
    Array.from({ length: stepCount }, (_, i) => [i, ArtSchema.safeParse(json[`step-${i + 1}`])] as const)
      .filter(([, parsed]) => parsed.success)
      .map(([i, parsed]) => [i, parsed.data as Art]),
  );
};

export const drawIllustrations = async (topic: string, steps: readonly StepText[]): Promise<Readonly<Record<number, Art>>> =>
  parseIllustrations(await askClaude(illustrationPrompt(topic, steps)), steps.length);

// Adds drawings to the steps that have none and no picture; a failed request leaves the plan as it was.
export const withIllustrations = async (topic: string, plan: Plan): Promise<Plan> => {
  try {
    const arts = await drawIllustrations(
      topic,
      plan.steps.map((step, i) => ({ ...step, narration: plan.narration[`step-${i + 1}`] })),
    );
    return { ...plan, steps: plan.steps.map((step, i) => (step.art || step.image || !arts[i] ? step : { ...step, art: arts[i] })) };
  } catch (e) {
    console.warn(`Illustrations skipped: ${e instanceof Error ? e.message : String(e)}`);
    return plan;
  }
};
