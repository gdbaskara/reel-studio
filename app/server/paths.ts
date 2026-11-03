import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PROJECT_ID, SCENE_ID } from "../shared/project";

export const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");
export const DATA_DIR = join(ROOT, "projects");
export const PORT = Number(process.env.PORT ?? 4310);

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

// Ids come from URLs, so they are checked before they ever touch the filesystem.
export const checkProjectId = (id: string): string => {
  if (!PROJECT_ID.test(id)) throw new HttpError(400, "Invalid project id");
  return id;
};

export const checkSceneId = (id: string): string => {
  if (!SCENE_ID.test(id)) throw new HttpError(400, "Invalid scene id");
  return id;
};

export const projectDir = (id: string) => join(DATA_DIR, checkProjectId(id));
export const audioDir = (id: string) => join(projectDir(id), "audio");
export const audioUrl = (id: string, file: string) => `/api/projects/${id}/audio/${file}`;
