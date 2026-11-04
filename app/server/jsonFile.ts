import { randomBytes } from "node:crypto";
import { rename, writeFile } from "node:fs/promises";

// Writes to a temporary file first, so readers never see a half-written file.
export const writeJson = async (path: string, value: unknown): Promise<void> => {
  const tmp = `${path}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await rename(tmp, path);
};
