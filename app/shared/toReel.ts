import { lookChoice } from "../../src/looks";
import type { ReelProps, ReelSpec } from "../../src/types";
import { musicSettings, type Project } from "./project";

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
  const look = lookChoice(project.options.look, project.options.palette);
  const spec: ReelSpec = {
    id: project.id,
    look: look.id,
    palette: look.palette,
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
  const music = project.music
    ? { src: `${audioBase}${project.music.src}`, duration: project.music.duration, ...musicSettings(project.options) }
    : undefined;
  return { spec, voice, captions: project.options.captions, progressBar: project.options.progressBar ?? true, ...(music ? { music } : {}) };
};
