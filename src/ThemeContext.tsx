import { createContext, useContext } from "react";
import type { ResolvedLook } from "./looks/types";
import type { Palette } from "./types";

const LookContext = createContext<ResolvedLook | null>(null);

export const LookProvider = LookContext.Provider;

// The reel's look: palette, fonts, sizes, motion and element styles.
export const useLook = (): ResolvedLook => {
  const look = useContext(LookContext);
  if (!look) throw new Error("useLook must be used inside a LookProvider");
  return look;
};

export const useTheme = (): Palette => useLook().palette;
