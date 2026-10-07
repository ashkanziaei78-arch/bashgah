import type { Metadata, Viewport } from "next";
import { Vazirmatn, Archivo } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { getSetting } from "@/lib/data";
import { cookies } from "next/headers";
import { familyOf, initialPalette, modeOf, MODE_COOKIE, type Family } from "@/lib/themes";
import { unstable_rethrow } from "next/navigation";

const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-vazir",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  // The wordmark is set in Archivo italic, as in the brand artwork.
  style: ["normal", "italic"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Fit Club", template: "%s | Fit Club" },
  description:
    "باشگاه Fit Club، برنامه تمرینی و غذایی اختصاصی، ویدیوی هر حرکت، و شمارش جلسات باقی‌مانده.",
  applicationName: "Fit Club",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Fit Club",
    statusBarStyle: "black-translucent",
  },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

/** The gym's colour family. Signed in, it is the member's own gym;
 *  signed out, the deployment's default gym. */
async function currentFamily(): Promise<Family> {
  // A colour preference must never take a page down: with the database
  // unreachable, every page still renders in the default family.
  try {
    return familyOf(await getSetting<string>("theme", "amariya"));
  } catch (err) {
    // Next's own control flow (dynamic rendering, redirects) travels as
    // thrown errors and must not be swallowed here.
    unstable_rethrow(err);
    return familyOf(null);
  }
}

export async function generateViewport(): Promise<Viewport> {
  const family = await currentFamily();
  return {
    ...viewport,
    themeColor: [
      { media: "(prefers-color-scheme: light)", color: family.dayChrome },
      { media: "(prefers-color-scheme: dark)", color: family.nightChrome },
    ],
  };
}

/** Runs before first paint. For "auto" it picks day or night from the
 *  phone's own setting and follows it if that changes, so nobody sees a
 *  light page flash before going dark. */
const MODE_SCRIPT = `(function(){try{var d=document.documentElement;if(d.dataset.mode!=="auto")return;var q=matchMedia("(prefers-color-scheme: dark)");var f=function(){if(d.dataset.mode==="auto")d.dataset.theme=q.matches?d.dataset.night:d.dataset.day};f();q.addEventListener("change",f)}catch(e){}})()`;

const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // never below 5 — capping zoom at 1 locks out low-vision users
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [family, jar] = await Promise.all([currentFamily(), cookies()]);
  const mode = modeOf(jar.get(MODE_COOKIE)?.value);
  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={initialPalette(family, mode)}
      data-day={family.day}
      data-night={family.night}
      data-mode={mode}
      className={`${vazir.variable} ${archivo.variable}`}
      // The mode script may switch data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: MODE_SCRIPT }} />
      </head>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
