import { PALETTES } from "../../src/palettes";
import type { ReelProps, ReelSpec } from "../../src/types";
import type { Project } from "./project";

export const sceneIdsOf = (plan: Project["plan"]): readonly string[] => [
  "title",
  ...plan.steps.map((_, i) => `step-${i + 1}`),
  "outro",
];

export const sceneLabel = (sceneId: string): string =>
  sceneId === "title" ? "Title" : sceneId === "outro" ? "Outro" : `Step ${sceneId.slice(5)}`;

// Turns a stored project into the props the Remotion reel renders.
// audioBase makes clip URLs absolute for server-side rendering.
export const toReelProps = (project: Project, audioBase = ""): ReelProps => {
  const spec: ReelSpec = {
    id: project.id,
    palette: PALETTES[project.options.palette],
    title: project.plan.title,
    steps: project.plan.steps,
    outro: project.plan.outro,
  };
  const voice = Object.fromEntries(
    Object.entries(project.voice).map(([id, clip]) => [
      id,
      { duration: clip.duration, text: clip.text, words: clip.words, src: `${audioBase}${clip.src}` },
    ]),
  );
  return { spec, voice, captions: project.options.captions };
};
