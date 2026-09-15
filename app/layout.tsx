import type { Metadata, Viewport } from "next";
import { Vazirmatn, Archivo } from "next/font/google";
import "./globals.css";
import { ServiceWorker } from "@/components/service-worker";

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
  themeColor: "#04101f",
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
    <html lang="fa" dir="rtl" className={`${vazir.variable} ${archivo.variable}`}>
      <body>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
