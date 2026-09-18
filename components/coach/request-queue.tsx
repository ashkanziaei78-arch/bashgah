"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Apple, CalendarClock, Check, Dumbbell, Loader2, X } from "lucide-react";
import { scheduleRequest, closeRequest } from "@/app/coach/actions";
import { faDateLong, faTime } from "@/lib/format";
import { SlotPicker } from "./slot-picker";

export interface QueueRow {
  id: string;
  kind: "workout" | "diet";
  status: "pending" | "scheduled";
  slotAt: string | null;
  message: string | null;
  studentId: string;
  studentName: string;
}

const KIND = {
  workout: { label: "برنامه تمرینی", icon: Dumbbell, href: "program" },
  diet: { label: "برنامه غذایی", icon: Apple, href: "diet" },
} as const;

export function RequestQueue({ rows }: { rows: QueueRow[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; message?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "انجام نشد. دوباره تلاش کنید.");
        return;
      }
      setOpenId(null);
      router.refresh();
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      <ul className="grid list-none gap-2.5 p-0">
        {rows.map((row) => {
          const { label, icon: Icon, href } = KIND[row.kind];
          const scheduled = row.status === "scheduled" && row.slotAt;

          return (
            <li key={row.id} className="fc-card p-3.5">
              <div className="flex items-start gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
                  <Icon className="size-[18px]" />
                </span>

                <div className="min-w-0 flex-1">
                  <b className="block text-[13.5px]">{row.studentName}</b>
                  <small className="text-[11.5px] text-fc-dim">{label}</small>
                  {row.message && (
                    <p className="mt-1.5 text-[12.5px] leading-relaxed text-fc-muted">
                      «{row.message}»
                    </p>
                  )}
                </div>

                <span
                  className={`fc-chip shrink-0 ${scheduled ? "fc-chip-ok" : "fc-chip-warn"}`}
                >
                  {scheduled ? "تایم دارد" : "در انتظار"}
                </span>
              </div>

              {scheduled && (
                <p className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-fc-ok">
                  <CalendarClock className="size-3.5" />
                  {faDateLong(row.slotAt!)} ساعت {faTime(row.slotAt!)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                {!scheduled && (
                  <button
                    type="button"
                    onClick={() => setOpenId(openId === row.id ? null : row.id)}
                    className="fc-btn fc-btn-ghost"
                    style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
                  >
                    <CalendarClock className="size-4" />
                    {openId === row.id ? "بستن" : "گذاشتن تایم"}
                  </button>
                )}

                {/* The session happens in person; the coach writes the plan
                    straight afterwards, so the queue links to the builder. */}
                <Link
                  href={`/coach/${row.studentId}/${href}`}
                  className="fc-btn fc-btn-ghost"
                  style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
                >
                  نوشتن {label}
                </Link>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => closeRequest(row.id, "done"))}
                  className="fc-btn fc-btn-ghost"
                  style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  انجام شد
                </button>

                <button
                  type="button"
                  disabled={pending}
                  onClick={() => run(() => closeRequest(row.id, "cancelled"))}
                  aria-label={`لغو درخواست ${row.studentName}`}
                  className="grid size-10 place-items-center rounded-xl text-fc-dim transition-colors hover:text-fc-bad"
                >
                  <X className="size-4" />
                </button>
              </div>

              {openId === row.id && !scheduled && (
                <SlotPicker
                  busy={pending}
                  onPick={(iso) => run(() => scheduleRequest(row.id, iso))}
                />
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
