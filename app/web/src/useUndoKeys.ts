import { useEffect, useRef } from "react";

// Cmd/Ctrl+Z undoes and Cmd/Ctrl+Shift+Z (or Ctrl+Y) redoes the editor's last change, also while typing,
// since the editor keeps its own history of every field.
export const useUndoKeys = (onUndo: () => void, onRedo: () => void): void => {
  const latest = useRef({ onUndo, onRedo });
  latest.current = { onUndo, onRedo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
      const key = e.key.toLowerCase();
      const isRedo = (key === "z" && e.shiftKey) || (key === "y" && e.ctrlKey && !e.metaKey);
      if (key !== "z" && !isRedo) return;
      e.preventDefault();
      if (isRedo) latest.current.onRedo();
      else latest.current.onUndo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
};
