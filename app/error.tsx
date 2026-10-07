"use client";

import { useEffect } from "react";
import { RotateCw } from "lucide-react";

/** A failed request should say what happened and offer the one useful
 *  move, not drop the member on a blank white screen. */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-5">
      <div className="fc-raised max-w-[42ch] p-8 text-center">
        <h1 className="mb-2.5 text-xl">صفحه باز نشد</h1>
        <p className="mb-6 text-[13.5px] text-fc-muted">
          ارتباط با سرور برقرار نشد. اینترنت را بررسی کنید و دوباره امتحان کنید.
        </p>
        <button type="button" onClick={reset} className="fc-btn">
          <RotateCw className="size-[18px]" />
          دوباره امتحان کنید
        </button>
      </div>
    </main>
  );
}
