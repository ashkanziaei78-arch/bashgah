/** The colour themes a gym can pick in its admin panel.
 *
 *  The palettes themselves live in app/globals.css under
 *  `[data-theme="<id>"]`; this list is what the picker shows and what the
 *  root layout trusts. Kept free of imports so tests can load it. */

export type ThemeId = "amariya" | "night" | "classic" | "graphite";

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  /** Page ground, card, primary, accent: what the picker swatch shows. */
  swatch: [string, string, string, string];
  /** Browser chrome colour on phones. */
  chrome: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: "amariya",
    name: "آماریا",
    description: "روشن، آبی برند با نارنجی",
    swatch: ["#ebebeb", "#ffffff", "#004e98", "#ff6700"],
    chrome: "#ebebeb",
  },
  {
    id: "night",
    name: "آماریا شب",
    description: "همان رنگ‌های برند روی زمینه‌ی تیره",
    swatch: ["#061527", "#0a1f38", "#6fa8e6", "#ff6700"],
    chrome: "#061527",
  },
  {
    id: "classic",
    name: "کلاسیک فیروزه‌ای",
    description: "ظاهر قبلی اپ، فیروزه‌ای روی سرمه‌ای",
    swatch: ["#04101f", "#071a2e", "#00b2e3", "#ff8a3d"],
    chrome: "#04101f",
  },
  {
    id: "graphite",
    name: "گرافیت",
    description: "خنثی و تیره با نارنجی، مناسب باکس کراسفیت",
    swatch: ["#111214", "#18191c", "#ff6700", "#c0c0c0"],
    chrome: "#111214",
  },
];

export const DEFAULT_THEME: ThemeId = "amariya";

export function themeOf(value: unknown): ThemeInfo {
  return THEMES.find((t) => t.id === value) ?? THEMES.find((t) => t.id === DEFAULT_THEME)!;
}
