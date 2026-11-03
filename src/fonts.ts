import { loadFont as loadCaveat } from "@remotion/google-fonts/Caveat";
import { loadFont as loadPoppins } from "@remotion/google-fonts/Poppins";

export const HAND_FONT = loadCaveat().fontFamily;
export const CAPTION_FONT = loadPoppins("normal", { weights: ["800"], subsets: ["latin"] }).fontFamily;
