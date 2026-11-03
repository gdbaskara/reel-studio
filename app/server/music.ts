import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Music } from "../shared/project";
import { durationSeconds, toAac } from "../../scripts/providers.mjs";
import { HttpError, audioDir, audioUrl } from "./paths";
import { dropPending, markPending, withTemp } from "./audioFiles";

// Reels are short, so only the start of a long song is kept.
const MAX_MUSIC_SECONDS = 300;
// Shorter tracks would loop so often they stop sounding like music.
const MIN_MUSIC_SECONDS = 2;
const NAME_LIMIT = 120;
const FALLBACK_NAME = "Background music";

// The browser sends the original file name URI-encoded in a header; keep a printable, short version.
export const musicFileName = (header: string | undefined): string => {
  if (!header) return FALLBACK_NAME;
  try {
    // eslint-disable-next-line no-control-regex
    const name = decodeURIComponent(header).replace(/[\u0000-\u001f\u007f]/g, "").trim();
    return name ? name.slice(0, NAME_LIMIT) : FALLBACK_NAME;
  } catch {
    return FALLBACK_NAME;
  }
};

// Converts an upload to AAC in the project's audio folder. The file stays pending until the
// caller saves it into project.json and calls releasePending.
export const importMusic = async (projectId: string, body: Buffer, name: string): Promise<Music> => {
  if (!body.length) throw new HttpError(400, "The upload was empty.");
  return withTemp(async (dir) => {
    const raw = join(dir, "upload.bin");
    await writeFile(raw, body);
    const folder = audioDir(projectId);
    await mkdir(folder, { recursive: true });
    const file = `music-${Date.now()}.m4a`;
    const out = join(folder, file);
    markPending(file);
    const discard = async () => {
      dropPending(file);
      await unlink(out).catch(() => undefined);
    };
    try {
      toAac(raw, out, MAX_MUSIC_SECONDS);
    } catch {
      await discard();
      throw new HttpError(400, "Could not read that audio file. Try MP3, M4A or WAV.");
    }
    const duration = (() => {
      try {
        return durationSeconds(out);
      } catch {
        return 0;
      }
    })();
    if (duration < MIN_MUSIC_SECONDS) {
      await discard();
      throw new HttpError(400, `Music must be at least ${MIN_MUSIC_SECONDS}s long.`);
    }
    return { src: audioUrl(projectId, file), duration, name };
  });
};
