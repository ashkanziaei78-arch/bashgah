import type { MetadataRoute } from "next";
import { BRAND_GROUND } from "@/lib/brand";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fit Club — باشگاه",
    short_name: "Fit Club",
    description:
      "برنامه تمرینی و غذایی اختصاصی، ویدیوی هر حرکت، و شمارش جلسات باقی‌مانده.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BRAND_GROUND,
    theme_color: BRAND_GROUND,
    dir: "rtl",
    lang: "fa-IR",
    categories: ["health", "fitness", "lifestyle"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "تمرین امروز", url: "/app/workout" },
      { name: "برنامه غذایی", url: "/app/nutrition" },
      { name: "ورود به باشگاه", url: "/app/checkin" },
    ],
  };
}
