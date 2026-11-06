import type { CreateOptions, Project } from "../../shared/project";
import { DRAWINGS } from "../../shared/project";

const PLACEHOLDER = { id: { lead: "Reel tentang", main: "Topik kamu" }, en: { lead: "A reel about", main: "Your topic" } } as const;
const TITLE_WORDS = 3;

// A stand-in reel for the create page's preview: the first words of the topic as its title,
// in the look being picked, so the choice can be seen before anything is generated.
export const sampleProject = (options: CreateOptions, prompt: string): Project => {
  const words = prompt.trim().split(/\s+/).filter(Boolean).slice(0, TITLE_WORDS).join(" ");
  const text = PLACEHOLDER[options.language];
  const steps = Array.from({ length: options.stepCount }, (_, i) => ({ title: "", note: "", drawing: DRAWINGS[i % DRAWINGS.length] }));
  return {
    id: "p-sample-000000",
    name: "sample",
    prompt,
    createdAt: "",
    updatedAt: "",
    options,
    plan: {
      name: "sample",
      title: { lead: text.lead, main: words || text.main },
      steps,
      outro: { main: "", sub: "" },
      narration: {},
    },
    voice: {},
    render: { status: "idle", progress: 0, updatedAt: "" },
  };
};
