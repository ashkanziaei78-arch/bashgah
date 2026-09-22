import type { Metadata, Viewport } from "next";
import { Vazirmatn, Barlow_Condensed, Barlow } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";
import { BRAND_GROUND } from "@/lib/brand";

const vazir = Vazirmatn({
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
  variable: "--font-vazir",
  display: "swap",
});

// Latin labels and every figure. Condensed is the athletic register —
// it lets a session count or a kilo weight run at 38px inside a phone
// card that Archivo would have forced down to 24px.
const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-barlow-c",
  display: "swap",
});

// Fallback for the rare Latin run that is a word rather than a label,
// where the condensed cut gets hard to read.
const barlow = Barlow({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Fit Club", template: "%s | Fit Club" },
  description:
    "باشگاه Fit Club — برنامه تمرینی و غذایی اختصاصی، ویدیوی هر حرکت، و شمارش جلسات باقی‌مانده.",
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

export const viewport: Viewport = {
  themeColor: BRAND_GROUND,
  width: "device-width",
  initialScale: 1,
  // never below 5 — capping zoom at 1 locks out low-vision users
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${barlowCondensed.variable} ${barlow.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
