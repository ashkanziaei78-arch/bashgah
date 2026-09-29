"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Scale } from "lucide-react";
import { logWeight } from "@/app/app/progress/actions";
import { faDigits } from "@/lib/format";

/** The member's weigh-in.
 *
 *  One number and one button. Every extra field here is a reason not to
 *  bother, and a chart with three points is worth less than a chart
 *  with thirty — so the date defaults to today and is only shown when
 *  somebody deliberately back-fills.
 */
export function WeightLogger({
  today,
  current,
}: {
  /** Today in Tehran, resolved on the server — the phone's clock and
   *  the database's idea of "today" have to agree or the upsert lands
   *  on the wrong day. */
  today: string;
  /** Today's reading if there already is one, so the field opens on
   *  the number being corrected rather than empty. */
  current: number | null;
}) {
  const [weight, setWeight] = useState(current === null ? "" : String(current));
  const [on, setOn] = useState(today);
  const [backdate, setBackdate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);

    startTransition(async () => {
      const result = await logWeight(Number(weight), backdate ? on : today);
      if (!result.ok) {
        setError(result.message ?? "ثبت نشد.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <section className="fc-raised p-5">
      <h2 className="mb-1 flex items-center gap-2 text-[14.5px]">
        <Scale className="size-4 text-fc-cyan" />
        وزن امروز
      </h2>
      <p className="mb-4 text-[12.5px] leading-relaxed text-fc-muted">
        {current === null
          ? "هفته‌ای یک بار، صبح و ناشتا بهترین زمان است. هر چه بیشتر ثبت کنید، نمودار درست‌تر می‌شود."
          : `امروز ${faDigits(current)} کیلو ثبت کرده‌اید. عدد تازه جای آن می‌نشیند.`}
      </p>

      <form onSubmit={submit}>
        <div className="flex items-end gap-2.5">
          <div className="min-w-0 flex-1">
            <label htmlFor="weight" className="mb-1.5 block text-[12px] text-fc-dim">
              وزن (کیلوگرم)
            </label>
            <input
              id="weight"
              type="number"
              inputMode="decimal"
              step="0.1"
              min={20}
              max={400}
              required
              value={weight}
              onChange={(e) => {
                setWeight(e.target.value);
                setSaved(false);
              }}
              placeholder="۰٫۰"
              dir="ltr"
              className="fc-input text-center"
              style={{ fontSize: 16 }}
              aria-invalid={!!error}
            />
          </div>
          <button type="submit" disabled={pending} className="fc-btn shrink-0">
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
            ثبت
          </button>
        </div>

        {backdate && (
          <div className="mt-3">
            <label htmlFor="on" className="mb-1.5 block text-[12px] text-fc-dim">
              تاریخ اندازه‌گیری
            </label>
            <input
              id="on"
              type="date"
              value={on}
              max={today}
              onChange={(e) => setOn(e.target.value)}
              dir="ltr"
              className="fc-input text-center"
              style={{ fontSize: 16 }}
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setBackdate((v) => !v)}
          className="fc-chip mt-3 transition-colors hover:text-fc-cyan"
        >
          {backdate ? "ثبت برای امروز" : "برای روز دیگری ثبت می‌کنم"}
        </button>

        {error && (
          <p role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
            {error}
          </p>
        )}
        {saved && !error && (
          <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-fc-ok">
            <Check className="size-4" />
            ثبت شد.
          </p>
        )}
      </form>
    </section>
  );
}
