"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Share, SquarePlus, Download, CheckCircle2, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/* Browser facts are external state, so they are read with
   useSyncExternalStore rather than copied into React state inside an
   effect. That keeps the server and client snapshots explicit and avoids
   a first paint that shows the wrong platform's instructions. */

function subscribeStandalone(onChange: () => void) {
  const mq = window.matchMedia("(display-mode: standalone)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function readStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari predates the display-mode query and uses its own flag
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/** Platform never changes within a session, so nothing to subscribe to. */
function subscribeNever() {
  return () => {};
}

/* getSnapshot must return the same value on every call or
   useSyncExternalStore re-renders forever, so the sniff runs once and the
   result is cached at module scope. */
let cachedPlatform: "ios" | "other" | undefined;

function readPlatform(): "ios" | "other" {
  if (cachedPlatform === undefined) {
    const ua = window.navigator.userAgent;
    cachedPlatform =
      /iPad|iPhone|iPod/.test(ua) ||
      // iPadOS 13+ reports as a Mac, so check for touch as well
      (ua.includes("Macintosh") && window.navigator.maxTouchPoints > 1)
        ? "ios"
        : "other";
  }
  return cachedPlatform;
}

export function InstallPrompt() {
  const standalone = useSyncExternalStore(subscribeStandalone, readStandalone, () => false);
  const platform = useSyncExternalStore(subscribeNever, readPlatform, () => null);

  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [justInstalled, setJustInstalled] = useState(false);

  useEffect(() => {
    // Chrome fires this only when the app passes the installability checks;
    // its arrival is what tells us a one-tap install is actually available.
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setJustInstalled(true);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const mode = standalone || justInstalled
    ? "installed"
    : platform === null
      ? "server"
      : deferred
        ? "android"
        : platform === "ios"
          ? "ios"
          : "desktop";

  if (mode === "server") return null;

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
          <p className="mt-4 text-[12.5px] text-fc-muted">
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
            if (outcome === "accepted") setJustInstalled(true);
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
