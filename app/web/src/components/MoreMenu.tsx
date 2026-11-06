import { useEffect, useRef, type ReactNode } from "react";

// A small menu for actions that do not need a place on the topbar. Escape or a click outside closes it.
export const MoreMenu = ({ children }: { readonly children: ReactNode }) => {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = (refocus: boolean) => {
      const menu = ref.current;
      if (!menu?.open) return;
      menu.open = false;
      if (refocus) menu.querySelector("summary")?.focus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <details className="more-menu" ref={ref}>
      <summary aria-label="More actions">More</summary>
      <div className="more-menu-list">{children}</div>
    </details>
  );
};
