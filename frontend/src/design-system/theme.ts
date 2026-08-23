export type HoneyTheme = "system" | "light" | "dark";

const themeKey = "honeyos-theme";

export function readHoneyTheme(): HoneyTheme {
  try {
    const value = window.localStorage.getItem(themeKey);
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

export function applyHoneyTheme(theme: HoneyTheme): void {
  if (theme === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.dataset.theme = theme;
  try {
    window.localStorage.setItem(themeKey, theme);
  } catch {
    // The system theme still works if local storage is unavailable.
  }
}
