import { execFile } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { LogoSchema, type Logo } from "../shared/project";
import { withTemp } from "./audioFiles";
import { HttpError } from "./paths";

const run = promisify(execFile);

// Logos sit in a corner at about 100px tall, so this keeps them sharp while staying small.
export const LOGO_MAX_SIDE = 320;
export const LOGO_UPLOAD_LIMIT = "8mb";

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

const SCALE = `scale='min(${LOGO_MAX_SIDE},iw)':'min(${LOGO_MAX_SIDE},ih)':force_original_aspect_ratio=decrease`;

// Converts an uploaded image to a PNG no larger than LOGO_MAX_SIDE, keeping transparency.
export const importLogo = async (body: Buffer): Promise<Logo> => {
  if (!body.length) throw new HttpError(400, "The upload was empty.");
  const kind = imageKind(body);
  if (!kind) throw new HttpError(400, "Use a PNG, JPG or WebP image for the logo.");
  return withTemp(async (dir) => {
    const input = join(dir, `upload.${kind}`);
    const output = join(dir, "logo.png");
    await writeFile(input, body);
    try {
      await run("ffmpeg", ["-loglevel", "error", "-y", "-i", input, "-vf", SCALE, "-frames:v", "1", "-pix_fmt", "rgba", output], { timeout: 60_000 });
    } catch {
      throw new HttpError(400, "Could not read that image. Try another PNG, JPG or WebP file.");
    }
    const png = await readFile(output);
    const size = pngSize(png);
    const logo = size ? LogoSchema.safeParse({ src: `data:image/png;base64,${png.toString("base64")}`, ...size }) : null;
    if (!logo?.success) throw new HttpError(400, "That image is too detailed to use as a logo. Try a simpler one.");
    return logo.data;
  });
};
