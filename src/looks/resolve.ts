import type { Palette } from "../types";
import { fontFamily } from "./fonts";
import { lookChoice } from "./index";
import type { LookId, ResolvedLook } from "./types";

// Loads the look's fonts and pairs it with the palette the reel was given.
export const resolveLook = (id: LookId | undefined, palette: Palette, paletteName = ""): ResolvedLook => {
  const { look } = lookChoice(id, paletteName);
  const { palettes: _palettes, fonts, ...rest } = look;
  return {
    ...rest,
    palette,
    paletteName,
    fonts: {
      display: fontFamily(fonts.display.key, fonts.display.weight),
      displayWeight: fonts.display.weight,
      caption: fontFamily(fonts.caption.key, fonts.caption.weight),
      captionWeight: fonts.caption.weight,
    },
  };
};
