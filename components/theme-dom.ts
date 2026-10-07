import { MODE_COOKIE, type Family, type Mode } from "@/lib/themes";

/** Applies a colour family and mode to the page now, the same way the
 *  root layout and its pre-paint script do, so a choice shows at once. */
export function applyTheme(next: { family?: Family; mode?: Mode }) {
  const d = document.documentElement;
  if (next.family) {
    d.setAttribute("data-day", next.family.day);
    d.setAttribute("data-night", next.family.night);
  }
  if (next.mode) d.setAttribute("data-mode", next.mode);
  const mode = d.getAttribute("data-mode");
  const dark = mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  d.setAttribute("data-theme", d.getAttribute(dark ? "data-night" : "data-day") ?? "amariya");
}

export function rememberMode(mode: Mode) {
  document.cookie = `${MODE_COOKIE}=${mode}; path=/; max-age=31536000; samesite=lax`;
}
