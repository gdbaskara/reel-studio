import { NOTEBOOK } from "../looks/notebook";
import type { ReelSpec } from "../types";

export const HOOKS_REEL: ReelSpec = {
  id: "hooks",
  palette: NOTEBOOK.palettes[1].colors,
  title: { lead: "3 hooks that", main: "stop the scroll" },
  steps: [
    { title: "Show the result first", note: "\"I made this in 10 minutes.\"", drawing: "arrow" },
    { title: "Call out your viewer", note: "\"If you edit reels by hand...\"", drawing: "circle" },
    { title: "Break the pattern", note: "Start mid-sentence. Then explain.", drawing: "zigzag" },
  ],
  outro: { main: "Save this", sub: "for your next reel" },
};
