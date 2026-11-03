import type { Palette } from "./types";

export const PALETTES = {
  warm: { paper: "#F6F1E7", ink: "#1F1F1F", accent: "#E8553D", highlight: "#FFD84D", onAccent: "#F6F1E7" },
  green: { paper: "#F4F7F1", ink: "#0B3B2E", accent: "#0A8A5F", highlight: "#D4EC5A", onAccent: "#F4F7F1" },
  blue: { paper: "#F2F5FA", ink: "#14213D", accent: "#2F6FEB", highlight: "#9FD8FF", onAccent: "#F2F5FA" },
} as const satisfies Record<string, Palette>;

export type PaletteName = keyof typeof PALETTES;
