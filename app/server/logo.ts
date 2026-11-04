import { LogoSchema, type Logo } from "../shared/project";
import { HttpError } from "./paths";
import { shrinkImage } from "./images";

export { imageKind, pngSize } from "./images";

// Logos sit in a corner at about 100px tall, so this keeps them sharp while staying small.
export const LOGO_MAX_SIDE = 320;
export const LOGO_UPLOAD_LIMIT = "8mb";

// Shrinks an uploaded logo to a small PNG kept inline as a data URL.
export const importLogo = async (body: Buffer): Promise<Logo> => {
  const { png, width, height } = await shrinkImage(body, LOGO_MAX_SIDE);
  const logo = LogoSchema.safeParse({ src: `data:image/png;base64,${png.toString("base64")}`, width, height });
  if (!logo.success) throw new HttpError(400, "That image is too detailed to use as a logo. Try a simpler one.");
  return logo.data;
};
