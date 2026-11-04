import type { PointerEvent } from "react";

// Touch screens fire pointer events on tap too; only a real mouse hover previews.
export const hoverHandlers = (preview: () => void, clear: () => void) => ({
  onPointerEnter: (e: PointerEvent) => {
    if (e.pointerType === "mouse") preview();
  },
  onPointerLeave: (e: PointerEvent) => {
    if (e.pointerType === "mouse") clear();
  },
});
