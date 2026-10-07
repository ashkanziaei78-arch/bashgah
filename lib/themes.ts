/** Colour themes.
 *
 *  A gym picks a *family* in its admin panel; every family has a day and
 *  a night palette, and each person picks light, dark, or "follow my
 *  phone" for themselves. The palettes live in app/globals.css under
 *  `[data-theme="<palette>"]`. Kept free of imports so tests can load it. */

export type PaletteId = "amariya" | "night" | "classic-day" | "classic" | "graphite-day" | "graphite";
export type FamilyId = "amariya" | "classic" | "graphite";
export type Mode = "auto" | "light" | "dark";

export interface Family {
  id: FamilyId;
  name: string;
  description: string;
  day: PaletteId;
  night: PaletteId;
  /** Ground, card, primary, accent: what the picker swatch shows. */
  daySwatch: [string, string, string, string];
  nightSwatch: [string, string, string, string];
  /** Browser chrome colour on phones, per mode. */
  dayChrome: string;
  nightChrome: string;
}

export const FAMILIES: Family[] = [
  {
    id: "amariya",
    name: "آماریا",
    description: "آبی برند با نارنجی، روی کاغذی روشن یا سرمه‌ای عمیق",
    day: "amariya",
    night: "night",
    daySwatch: ["#ebebeb", "#ffffff", "#004e98", "#ff6700"],
    nightSwatch: ["#061527", "#0a1f38", "#6fa8e6", "#ff6700"],
    dayChrome: "#ebebeb",
    nightChrome: "#061527",
  },
  {
    id: "classic",
    name: "کلاسیک فیروزه‌ای",
    description: "رنگ‌های قبلی اپ، فیروزه‌ای و سرمه‌ای",
    day: "classic-day",
    night: "classic",
    daySwatch: ["#eef4f8", "#ffffff", "#00698a", "#ff8a3d"],
    nightSwatch: ["#04101f", "#071a2e", "#00b2e3", "#ff8a3d"],
    dayChrome: "#eef4f8",
    nightChrome: "#04101f",
  },
  {
    id: "graphite",
    name: "گرافیت",
    description: "خنثی با نارنجی، مناسب باکس کراسفیت",
    day: "graphite-day",
    night: "graphite",
    daySwatch: ["#ebebeb", "#ffffff", "#a84400", "#ff6700"],
    nightSwatch: ["#111214", "#18191c", "#ff6700", "#c0c0c0"],
    dayChrome: "#ebebeb",
    nightChrome: "#111214",
  },
];

export const DEFAULT_FAMILY: FamilyId = "amariya";
export const MODE_COOKIE = "fc-mode";

/** The family a stored setting names. Older installs stored a palette
 *  ("night"), which maps to the family it belongs to. */
export function familyOf(value: unknown): Family {
  const byId = FAMILIES.find((f) => f.id === value);
  if (byId) return byId;
  const byPalette = FAMILIES.find((f) => f.day === value || f.night === value);
  return byPalette ?? FAMILIES.find((f) => f.id === DEFAULT_FAMILY)!;
}

export function modeOf(value: unknown): Mode {
  return value === "light" || value === "dark" ? value : "auto";
}

/** The palette to render before the browser has said anything. "auto"
 *  starts on day; the inline script in the root layout corrects it from
 *  the system setting before the first paint. */
export function initialPalette(family: Family, mode: Mode): PaletteId {
  return mode === "dark" ? family.night : family.day;
}
