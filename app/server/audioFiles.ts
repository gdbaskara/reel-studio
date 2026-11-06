import { mkdtemp, readdir, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Project } from "../shared/project";
import { audioDir } from "./paths";

// Anything stored in a project's media ("audio") folder: voice clips, the music track and step images.
type AudioRef = { readonly src: string };

const fileOf = (ref: AudioRef) => ref.src.split("/").pop() ?? "";

// Every media file a project still points at: its voice clips, its music track, its step images and its backdrop picture.
export const audioInUse = (
  project: Pick<Project, "voice" | "music"> & { readonly plan?: Pick<Project["plan"], "steps">; readonly options?: Pick<Project["options"], "backdrop"> },
): readonly AudioRef[] => [
  ...Object.values(project.voice),
  ...(project.music ? [project.music] : []),
  ...(project.plan?.steps.flatMap((step) => (step.image ? [step.image] : [])) ?? []),
  ...(project.options?.backdrop?.kind === "image" ? [project.options.backdrop.image] : []),
];

// Audio files written but not yet saved into project.json; pruning must leave them alone.
const pending = new Set<string>();
export const markPending = (file: string) => pending.add(file);
export const dropPending = (file: string) => pending.delete(file);
export const releasePending = (ref: AudioRef) => pending.delete(fileOf(ref));

export const withTemp = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// Deletes audio files no longer referenced by the project.
export const pruneAudio = async (projectId: string, keep: readonly AudioRef[]) => {
  const dir = audioDir(projectId);
  const used = new Set(keep.map(fileOf));
  const files = await readdir(dir).catch(() => [] as string[]);
  const stale = files.filter((f) => !used.has(f) && !pending.has(f));
  await Promise.all(stale.map((f) => unlink(join(dir, f)).catch(() => undefined)));
};
