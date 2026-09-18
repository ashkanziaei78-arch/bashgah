"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Nfc } from "lucide-react";
import { setCheckinEnabled } from "@/app/admin/actions";

export function CheckinToggle({ initial }: { initial: boolean }) {
  const [on, setOn] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    const next = !on;
    setOn(next); // optimistic — reverted below if the write is refused
    setError(null);

    startTransition(async () => {
      const result = await setCheckinEnabled(next);
      if (!result.ok) {
        setOn(!next);
        setError(result.message ?? "ذخیره نشد.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="fc-card flex items-start gap-3.5 p-4">
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-xl border transition-colors ${
            on
              ? "border-fc-cyan/40 bg-fc-cyan/10 text-fc-cyan"
              : "border-[var(--fc-line2)] text-fc-dim"
          }`}
        >
          <Nfc className="size-[18px]" />
        </span>

        <div className="min-w-0 flex-1">
          <b className="block text-[13.5px]">ماژول ورود با کارت</b>
          <p className="mt-1 text-[12.5px] leading-relaxed text-fc-muted">
            {on
              ? "روشن است. هر تپ کارت یک جلسه کم می‌کند و تب «ورود» در اپ اعضا دیده می‌شود."
              : "خاموش است. تب «ورود» از اپ اعضا برداشته شده و دستگاه درب هیچ جلسه‌ای کم نمی‌کند."}
          </p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="ماژول ورود با کارت"
          disabled={pending}
          onClick={toggle}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors disabled:opacity-50 ${
            on ? "border-fc-cyan bg-fc-cyan/30" : "border-[var(--fc-line2)] bg-fc-ink"
          }`}
        >
          <span
            className={`absolute top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full transition-all ${
              on ? "start-[22px] bg-fc-cyan" : "start-[3px] bg-fc-dim"
            }`}
          >
            {pending && <Loader2 className="size-3 animate-spin text-fc-ink" />}
          </span>
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
    </>
  );
}
