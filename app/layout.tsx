import type { Metadata, Viewport } from "next";
import { Vazirmatn, Archivo } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { getSetting } from "@/lib/data";
import { themeOf } from "@/lib/themes";
import { unstable_rethrow } from "next/navigation";

const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-vazir",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
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

/** The gym's chosen theme. Signed in, it is the member's own gym; signed
 *  out, the deployment's default gym. */
async function currentTheme() {
  // A colour preference must never take a page down: with the database
  // unreachable, every page still renders in the default theme.
  try {
    return themeOf(await getSetting<string>("theme", "amariya"));
  } catch (err) {
    // Next's own control flow (dynamic rendering, redirects) travels as
    // thrown errors and must not be swallowed here.
    unstable_rethrow(err);
    return themeOf(null);
  }
}

export async function generateViewport(): Promise<Viewport> {
  return { ...viewport, themeColor: (await currentTheme()).chrome };
}

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
  const theme = await currentTheme();
  return (
    <html
      lang="fa"
      dir="rtl"
      data-theme={theme.id}
      className={`${vazir.variable} ${archivo.variable}`}
    >
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
