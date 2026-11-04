import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { StepImage } from "../shared/project";
import { dropPending, markPending } from "./audioFiles";
import { IMAGE_MAX_SIDE, imageFileName, shrinkImage } from "./images";
import { audioDir, audioUrl } from "./paths";

// Shrinks an upload and writes it to the project's media folder. The file stays pending until the
// caller saves it into project.json and calls releasePending, so pruning cannot remove it first.
export const saveStepImage = async (projectId: string, body: Buffer): Promise<StepImage> => {
  const { png, width, height } = await shrinkImage(body, IMAGE_MAX_SIDE);
  const folder = audioDir(projectId);
  await mkdir(folder, { recursive: true });
  const file = imageFileName(Date.now());
  markPending(file);
  try {
    await writeFile(join(folder, file), png);
  } catch (error) {
    dropPending(file);
    throw error;
  }
  return { src: audioUrl(projectId, file), width, height };
};
