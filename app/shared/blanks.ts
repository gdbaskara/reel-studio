import type { Plan } from "./project";

// Scenes whose main on-screen line is still empty; rendering them would show a blank frame.
// The small lines (title lead, sticky note, outro sub) are optional.
export const blankScenes = (plan: Plan): readonly string[] => [
  ...(plan.title.main.trim() ? [] : ["Title"]),
  ...plan.steps.flatMap((s, i) => (s.title.trim() ? [] : [`Step ${i + 1}`])),
  ...(plan.outro.main.trim() ? [] : ["Outro"]),
];
