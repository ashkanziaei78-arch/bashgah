"use client";

import { useEffect, useState } from "react";
import { Share, SquarePlus, Download, CheckCircle2, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Mode = "checking" | "installed" | "android" | "ios" | "desktop";

export function InstallPrompt() {
  const [mode, setMode] = useState<Mode>("checking");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari predates the display-mode query and uses its own flag
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;

    if (standalone) {
      setMode("installed");
      return;
    }

    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as a Mac, so check for touch as well
      (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);

    setMode(isIOS ? "ios" : "desktop");

    // Chrome fires this only when the app passes the installability checks;
    // its arrival is what tells us a one-tap install is actually available.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setMode("android");
    };
    const onInstalled = () => setMode("installed");

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (mode === "checking") return null;

  if (mode === "installed") {
    return (
      <div className="fc-raised flex items-center gap-4 p-6">
        <CheckCircle2 className="size-8 shrink-0 text-fc-ok" />
        <div>
          <b className="block text-[15px]">اپ نصب است</b>
          <p className="text-[13.5px] text-fc-muted">
            Fit Club را از روی صفحه‌ی اصلی گوشی‌تان باز کرده‌اید.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fc-raised grid items-center gap-6 p-7 md:grid-cols-[1fr_auto]">
      <div>
        <div className="mb-3 flex items-center gap-2.5">
          <Smartphone className="size-5 text-fc-cyan" />
          <span className="fc-eyebrow">نصب روی گوشی</span>
        </div>
        <h3 className="mb-2 text-xl">Fit Club را مثل یک اپ نصب کنید</h3>
        <p className="max-w-[52ch] text-[13.5px] text-fc-muted">
          بدون کافه‌بازار و گوگل‌پلی. بعد از نصب، آیکون روی صفحه‌ی اصلی می‌آید،
          تمام‌صفحه باز می‌شود و برنامه‌ی تمرینی‌تان بدون اینترنت هم در دسترس است.
        </p>

        {mode === "ios" && (
          <ol className="mt-5 grid list-none gap-3 p-0 text-[13.5px] text-fc-muted">
            <li className="flex items-center gap-2.5">
              <span className="fc-lat grid size-6 shrink-0 place-items-center rounded-md bg-fc-cyan/12 text-[11px] text-fc-cyan">
                ۱
              </span>
              در Safari دکمه‌ی
              <Share className="size-4 text-fc-cyan" />
              <b className="text-fc-text">اشتراک‌گذاری</b> را بزنید
            </li>
            <li className="flex items-center gap-2.5">
              <span className="fc-lat grid size-6 shrink-0 place-items-center rounded-md bg-fc-cyan/12 text-[11px] text-fc-cyan">
                ۲
              </span>
              گزینه‌ی
              <SquarePlus className="size-4 text-fc-cyan" />
              <b className="text-fc-text">Add to Home Screen</b> را انتخاب کنید
            </li>
            <li className="flex items-center gap-2.5">
              <span className="fc-lat grid size-6 shrink-0 place-items-center rounded-md bg-fc-cyan/12 text-[11px] text-fc-cyan">
                ۳
              </span>
              <b className="text-fc-text">Add</b> را بزنید — تمام
            </li>
          </ol>
        )}

        {mode === "desktop" && (
          <p className="mt-4 text-[12.5px] text-fc-dim">
            این صفحه را روی گوشی باز کنید تا دکمه‌ی نصب فعال شود.
          </p>
        )}
      </div>

      {mode === "android" && (
        <button
          className="fc-btn"
          onClick={async () => {
            if (!deferred) return;
            await deferred.prompt();
            const { outcome } = await deferred.userChoice;
            if (outcome === "accepted") setMode("installed");
            setDeferred(null);
          }}
        >
          <Download className="size-[18px]" />
          نصب اپ
        </button>
      )}
    </div>
  );
}
