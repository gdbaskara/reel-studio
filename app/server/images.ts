import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { withTemp } from "./audioFiles";
import { HttpError } from "./paths";

const run = promisify(execFile);

// Step images are shown at most about 880px wide, so this keeps screenshots sharp without huge files.
export const IMAGE_MAX_SIDE = 1000;
export const IMAGE_UPLOAD_LIMIT = "15mb";

type ImageKind = "png" | "jpeg" | "webp";

// Uploads are identified by their first bytes, never by their name or content type.
export const imageKind = (body: Buffer): ImageKind | null => {
  if (body.length >= 8 && body.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (body.length >= 3 && body[0] === 0xff && body[1] === 0xd8 && body[2] === 0xff) return "jpeg";
  if (body.length >= 12 && body.toString("latin1", 0, 4) === "RIFF" && body.toString("latin1", 8, 12) === "WEBP") return "webp";
  return null;
};

// Width and height from a PNG's header chunk.
export const pngSize = (body: Buffer): { width: number; height: number } | null =>
  imageKind(body) === "png" && body.length >= 24 && body.toString("latin1", 12, 16) === "IHDR"
    ? { width: body.readUInt32BE(16), height: body.readUInt32BE(20) }
    : null;

export type ShrunkImage = { readonly png: Buffer; readonly width: number; readonly height: number };

// Converts an uploaded image to a PNG no larger than maxSide on either side, keeping transparency.
export const shrinkImage = async (body: Buffer, maxSide: number): Promise<ShrunkImage> => {
  if (!body.length) throw new HttpError(400, "The upload was empty.");
  const kind = imageKind(body);
  if (!kind) throw new HttpError(400, "Use a PNG, JPG or WebP image.");
  return withTemp(async (dir) => {
    const input = join(dir, `upload.${kind}`);
    const output = join(dir, "out.png");
    await writeFile(input, body);
    const scale = `scale='min(${maxSide},iw)':'min(${maxSide},ih)':force_original_aspect_ratio=decrease`;
    try {
      await run("ffmpeg", ["-loglevel", "error", "-y", "-i", input, "-vf", scale, "-frames:v", "1", "-pix_fmt", "rgba", output], { timeout: 60_000 });
    } catch {
      throw new HttpError(400, "Could not read that image. Try another PNG, JPG or WebP file.");
    }
    const png = await readFile(output);
    const size = pngSize(png);
    if (!size) throw new HttpError(400, "Could not read that image. Try another PNG, JPG or WebP file.");
    return { png, ...size };
  });
};

export const imageFileName = (stamp: number) => `image-${stamp}.png`;
