import { loadFont as loadAnton } from "@remotion/google-fonts/Anton";
import { loadFont as loadArchivoBlack } from "@remotion/google-fonts/ArchivoBlack";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadDMSerifDisplay } from "@remotion/google-fonts/DMSerifDisplay";
import { loadFont as loadFraunces } from "@remotion/google-fonts/Fraunces";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import { loadFont as loadNunito } from "@remotion/google-fonts/Nunito";
import { loadFont as loadPermanentMarker } from "@remotion/google-fonts/PermanentMarker";
import { loadFont as loadPlayfairDisplay } from "@remotion/google-fonts/PlayfairDisplay";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";
import { loadFont as loadSpaceGrotesk } from "@remotion/google-fonts/SpaceGrotesk";
import { loadFont as loadUnbounded } from "@remotion/google-fonts/Unbounded";

type Loader = (weight: number) => string;

// Each loader fetches only the weight it is asked for (Caveat keeps every weight, as before).
// Only fonts a reel actually uses get loaded, so previews and renders stay light.
// The loaders type weights as per-font literals; a weight a font lacks fails loudly when loaded.
const latin = (weight: number) => ({ weights: [String(weight)], subsets: ["latin"] }) as never;

const LOADERS = {
  caveat: () => loadCaveat().fontFamily,
  poppins: (w) => loadPoppins("normal", latin(w)).fontFamily,
  anton: (w) => loadAnton("normal", latin(w)).fontFamily,
  "archivo-black": (w) => loadArchivoBlack("normal", latin(w)).fontFamily,
  "bebas-neue": (w) => loadBebasNeue("normal", latin(w)).fontFamily,
  "dm-serif-display": (w) => loadDMSerifDisplay("normal", latin(w)).fontFamily,
  fraunces: (w) => loadFraunces("normal", latin(w)).fontFamily,
  inter: (w) => loadInter("normal", latin(w)).fontFamily,
  montserrat: (w) => loadMontserrat("normal", latin(w)).fontFamily,
  nunito: (w) => loadNunito("normal", latin(w)).fontFamily,
  "permanent-marker": (w) => loadPermanentMarker("normal", latin(w)).fontFamily,
  "playfair-display": (w) => loadPlayfairDisplay("normal", latin(w)).fontFamily,
  "space-grotesk": (w) => loadSpaceGrotesk("normal", latin(w)).fontFamily,
  unbounded: (w) => loadUnbounded("normal", latin(w)).fontFamily,
} as const satisfies Record<string, Loader>;

export type FontKey = keyof typeof LOADERS;
export const FONT_KEYS = Object.keys(LOADERS) as readonly FontKey[];

const loaded = new Map<string, string>();

// Loads a font weight the first time it is needed and returns its CSS family name.
export const fontFamily = (key: FontKey, weight: number): string => {
  const id = `${key}:${weight}`;
  const cached = loaded.get(id);
  if (cached) return cached;
  const family = (LOADERS[key] as Loader)(weight);
  loaded.set(id, family);
  return family;
};
