import { copyFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import type { Project } from "../shared/project";
import { audioInUse } from "./audioFiles";
import { audioDir, audioUrl, projectDir } from "./paths";
import { getProject, newProjectId, saveProject } from "./store";

const NAME_LIMIT = 80;
const SUFFIX = { id: " (salinan)", en: " (copy)" } as const;

const fileOf = (src: string) => src.split("/").pop() ?? "";

// A copy of a project under a new id: same content, look, voices and music, nothing rendered yet.
// Audio URLs point at the copy's own folder, since the files are copied there.
export const duplicateOf = (project: Project, id: string, now: string): Project => {
  const suffix = SUFFIX[project.options.language];
  const name = `${project.name.slice(0, NAME_LIMIT - suffix.length)}${suffix}`;
  const moved = <T extends { readonly src: string }>(ref: T): T => ({ ...ref, src: audioUrl(id, fileOf(ref.src)) });
  return {
    ...project,
    id,
    name,
    createdAt: now,
    updatedAt: now,
    plan: { ...project.plan, name, steps: project.plan.steps.map((step) => (step.image ? { ...step, image: moved(step.image) } : step)) },
    voice: Object.fromEntries(Object.entries(project.voice).map(([sceneId, clip]) => [sceneId, moved(clip)])),
    ...(project.music ? { music: moved(project.music) } : {}),
    ...(project.options.backdrop?.kind === "image"
      ? { options: { ...project.options, backdrop: { ...project.options.backdrop, image: moved(project.options.backdrop.image) } } }
      : {}),
    render: { status: "idle", progress: 0, updatedAt: now },
  };
};

// Copies only the audio the project points at. Those files are removed only by pruning, which runs
// under the same project lock as this, while a voice still being made may add or rename others.
// A copy that fails part way is removed again.
export const duplicateProject = async (id: string): Promise<Project> => {
  const source = await getProject(id);
  const copy = duplicateOf(source, newProjectId(), new Date().toISOString());
  try {
    await mkdir(audioDir(copy.id), { recursive: true });
    await Promise.all(
      audioInUse(source).map((ref) => copyFile(join(audioDir(id), fileOf(ref.src)), join(audioDir(copy.id), fileOf(ref.src)))),
    );
    return await saveProject(copy);
  } catch (error) {
    await rm(projectDir(copy.id), { recursive: true, force: true });
    throw error;
  }
};
