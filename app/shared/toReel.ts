import { lookChoice } from "../../src/looks";
import type { BrandMark, ReelProps, ReelSpec } from "../../src/types";
import { DEFAULT_BRAND_POSITION, musicSettings, type Backdrop, type Project } from "./project";
import { isDefaultTune } from "../../src/looks/tune";

export const sceneIdsOf = (plan: Project["plan"]): readonly string[] => [
  "title",
  ...plan.steps.map((_, i) => `step-${i + 1}`),
  "outro",
];

export const sceneLabel = (sceneId: string): string =>
  sceneId === "title" ? "Title" : sceneId === "outro" ? "Outro" : `Step ${sceneId.slice(5)}`;

// The brand mark, or undefined when there is nothing to show.
export const brandOf = (project: Pick<Project, "options" | "logo">): BrandMark | undefined => {
  const handle = project.options.brand?.handle.trim() ?? "";
  const position = project.options.brand?.position ?? DEFAULT_BRAND_POSITION;
  if (!handle && !project.logo) return undefined;
  return { handle, position, ...(project.logo ? { logo: project.logo.src } : {}) };
};

// The look's own background needs nothing in the spec; an uploaded picture gets the server address.
const backdropOf = (backdrop: Backdrop | undefined, audioBase: string): { backdrop?: Backdrop } => {
  if (!backdrop || backdrop.kind === "look") return {};
  if (backdrop.kind !== "image") return { backdrop };
  return { backdrop: { ...backdrop, image: { ...backdrop.image, src: `${audioBase}${backdrop.image.src}` } } };
};

// Turns a stored project into the props the Remotion reel renders.
// audioBase makes clip URLs absolute for server-side rendering.
export const toReelProps = (project: Project, audioBase = ""): ReelProps => {
  const look = lookChoice(project.options.look, project.options.palette);
  const spec: ReelSpec = {
    id: project.id,
    look: look.id,
    palette: look.palette,
    ...(project.options.transition ? { transition: project.options.transition } : {}),
    ...(project.options.tune && !isDefaultTune(project.options.tune) ? { tune: project.options.tune } : {}),
    title: project.plan.title,
    steps: project.plan.steps.map((step) => (step.image ? { ...step, image: { ...step.image, src: `${audioBase}${step.image.src}` } } : step)),
    outro: project.plan.outro,
    ...backdropOf(project.options.backdrop, audioBase),
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
  const brand = brandOf(project);
  return {
    spec,
    voice,
    captions: project.options.captions,
    progressBar: project.options.progressBar ?? true,
    ...(music ? { music } : {}),
    ...(brand ? { brand } : {}),
  };
};
