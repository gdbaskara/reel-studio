import type { Palette } from "../types";
import { BOLD_POP } from "./bold-pop";
import { KORAN } from "./koran";
import { MINIMAL } from "./minimal";
import { NEON } from "./neon";
import { NOTEBOOK } from "./notebook";
import { PASTEL } from "./pastel";
import { LOOK_IDS, type Look, type LookId } from "./types";

export const LOOKS: Readonly<Record<LookId, Look>> = {
  notebook: NOTEBOOK,
  "bold-pop": BOLD_POP,
  minimal: MINIMAL,
  neon: NEON,
  koran: KORAN,
  pastel: PASTEL,
};

export const DEFAULT_LOOK: LookId = LOOK_IDS[0];

export type LookChoice = { readonly id: LookId; readonly look: Look; readonly paletteName: string; readonly palette: Palette };

// Picks the look and palette a reel uses. Unknown looks fall back to Notebook and unknown palettes
// to the look's first one, so projects saved before looks existed (palette only) still work.
export const lookChoice = (id: LookId | undefined, paletteName: string | undefined): LookChoice => {
  const look = (id && LOOKS[id]) || LOOKS[DEFAULT_LOOK];
  const named = look.palettes.find((p) => p.name === paletteName) ?? look.palettes[0];
  return { id: look.id, look, paletteName: named.name, palette: named.colors };
};
