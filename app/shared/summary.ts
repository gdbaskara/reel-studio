import type { ReelProps } from "../../src/types";
import type { Project } from "./project";
import { toReelProps } from "./toReel";

// What the reel list needs per reel: its card details and enough of the reel to draw a thumbnail
// of the title scene. Voices and music are left out; a still never plays them.
export type ProjectSummary = Pick<Project, "id" | "name" | "updatedAt"> & {
  readonly steps: number;
  readonly rendered: boolean;
  readonly preview: ReelProps;
};

export const projectSummary = (project: Project): ProjectSummary => {
  const { music: _music, ...props } = toReelProps(project);
  return {
    id: project.id,
    name: project.name,
    updatedAt: project.updatedAt,
    steps: project.plan.steps.length,
    rendered: project.render.status === "done",
    preview: { ...props, voice: {} },
  };
};
