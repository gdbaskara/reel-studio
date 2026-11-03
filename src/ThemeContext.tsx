import { createContext, useContext } from "react";
import type { Palette } from "./types";

const ThemeContext = createContext<Palette | null>(null);

export const ThemeProvider = ThemeContext.Provider;

export const useTheme = (): Palette => {
  const palette = useContext(ThemeContext);
  if (!palette) throw new Error("useTheme must be used inside a ThemeProvider");
  return palette;
};
