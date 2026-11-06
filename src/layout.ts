import { createContext, useContext } from "react";

// Where scene content starts on the 1080x1920 canvas. A brand mark takes the top band,
// so branded reels start their content lower, with room for badges that overshoot as they pop in.
export const CONTENT_TOP = 240;
export const BRANDED_CONTENT_TOP = 330;
// Scene content should end here, above the captions (which sit 380px from the bottom).
export const CONTENT_BOTTOM = 1420;
export const CANVAS_HEIGHT = 1920;

const ContentTopContext = createContext(CONTENT_TOP);
export const ContentTopProvider = ContentTopContext.Provider;
export const useContentTop = (): number => useContext(ContentTopContext);
