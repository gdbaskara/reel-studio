import { useState, type ReactNode } from "react";
import { applyTheme, loadTheme, nextTheme, saveTheme, type Theme } from "../theme";

const LABEL: Readonly<Record<Theme, string>> = { system: "System", light: "Light", dark: "Dark" };

const ICON: Readonly<Record<Theme, ReactNode>> = {
  system: (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  light: (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  ),
  dark: (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 13A9 9 0 1 1 11 3a7 7 0 0 0 10 10z" />
    </svg>
  ),
};

// Cycles System, Light and Dark. The label says what is active now.
export const ThemeToggle = () => {
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const change = () => {
    const next = nextTheme(theme);
    applyTheme(next);
    saveTheme(next);
    setTheme(next);
  };
  return (
    <button type="button" className="theme-toggle" onClick={change} title={`Theme: ${LABEL[theme]} (click to change)`} aria-label={`Theme: ${LABEL[theme]}`}>
      {ICON[theme]} {LABEL[theme]}
    </button>
  );
};
