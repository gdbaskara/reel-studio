// The editor's colour theme. "system" follows the OS setting; light and dark override it.
// The choice is kept in this browser only.
export const THEMES = ["system", "light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_KEY = "reel-studio:theme";

export const nextTheme = (theme: Theme): Theme => THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length];

export const readTheme = (saved: string | null): Theme => (THEMES as readonly string[]).includes(saved ?? "") ? (saved as Theme) : "system";

// Storage can be unavailable (private windows, blocked site data); the theme then just isn't remembered.
export const loadTheme = (): Theme => {
  try {
    return readTheme(window.localStorage.getItem(THEME_KEY));
  } catch {
    return "system";
  }
};

export const saveTheme = (theme: Theme): void => {
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Not remembered; the page still switches.
  }
};

// Sets the theme on <html>: no attribute means follow the system.
export const applyTheme = (theme: Theme): void => {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", theme);
};
