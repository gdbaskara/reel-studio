import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { z } from "zod";
import { SavedStyleSchema, type SavedStyle } from "../shared/savedStyle";
import { writeJson } from "./jsonFile";
import { withProjectLock } from "./lock";
import { HttpError, ROOT } from "./paths";

export const STYLES_FILE = join(ROOT, "saved-styles", "styles.json");

export const newStyleId = () => `s-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

export type StyleStore = {
  readonly list: () => Promise<readonly SavedStyle[]>;
  readonly get: (id: string) => Promise<SavedStyle>;
  readonly add: (style: SavedStyle) => Promise<SavedStyle>;
  readonly remove: (id: string) => Promise<void>;
};

// Saved styles are shared by every project, so they live in one file outside the projects folder.
// Writes run one at a time under a lock keyed by the file.
export const styleStore = (path: string): StyleStore => {
  const lockKey = `styles:${path}`;
  const read = async (): Promise<readonly SavedStyle[]> =>
    existsSync(path) ? z.array(SavedStyleSchema).parse(JSON.parse(await readFile(path, "utf8"))) : [];
  const change = (fn: (styles: readonly SavedStyle[]) => readonly SavedStyle[]) =>
    withProjectLock(lockKey, async () => {
      await mkdir(dirname(path), { recursive: true });
      await writeJson(path, fn(await read()));
    });
  const list = async () => [...(await read())].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return {
    list,
    get: async (id) => {
      const style = (await read()).find((s) => s.id === id);
      if (!style) throw new HttpError(404, "Saved style not found");
      return style;
    },
    add: async (style) => {
      const valid = SavedStyleSchema.parse(style);
      await change((styles) => [...styles.filter((s) => s.id !== valid.id), valid]);
      return valid;
    },
    remove: (id) => change((styles) => styles.filter((s) => s.id !== id)),
  };
};

export const savedStyles = styleStore(STYLES_FILE);
