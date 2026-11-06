import { useRef, type MouseEvent } from "react";

// The player stacks transparent layers (captions, its own controls) over the scene, so the element
// under the pointer is rarely the text itself. This looks through every layer at that point.
export const editableAt = (x: number, y: number): HTMLElement | null =>
  document.elementsFromPoint(x, y).find((el): el is HTMLElement => el instanceof HTMLElement && el.dataset.edit !== undefined) ?? null;

// Marks the editable text under the pointer with data-hover, so CSS can outline it and show a text cursor.
export const useEditableHover = () => {
  const current = useRef<HTMLElement | null>(null);
  const set = (el: HTMLElement | null, frame: HTMLElement) => {
    if (current.current === el) return;
    current.current?.removeAttribute("data-hover");
    el?.setAttribute("data-hover", "");
    frame.classList.toggle("over-text", el !== null);
    current.current = el;
  };
  return {
    onMouseMove: (e: MouseEvent<HTMLElement>) => set(editableAt(e.clientX, e.clientY), e.currentTarget),
    onMouseLeave: (e: MouseEvent<HTMLElement>) => set(null, e.currentTarget),
  };
};
