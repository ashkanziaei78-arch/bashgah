"use client";

import { useState, useTransition } from "react";
import { Check, X, UserPlus, Loader2, Ban, Users, Undo2, Trash2 } from "lucide-react";
import {
  setAttendance, staffAddToClass, staffRemoveFromClass, setCapacity, cancelClasses,
} from "@/app/coach/classes/actions";
import { faDigits } from "@/lib/format";
import type { BookingStatus } from "@/lib/classes";

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  function run(fn: () => Promise<{ ok: boolean; message?: string }>, onOk?: () => void) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "انجام نشد.");
      else onOk?.();
    });
  }
  return { pending, error, run };
}

/** One person on the roster: attendance once the class is close, and a
 *  way to take them off it. */
export function RosterRow({
  sessionId,
  bookingId,
  studentId,
  name,
  status,
  canMark,
  note,
  position,
}: {
  sessionId: string;
  bookingId: string;
  studentId: string;
  name: string;
  status: BookingStatus;
  canMark: boolean;
  note?: string;
  /** Place in the waitlist, shown in the badge instead of an initial. */
  position?: number;
}) {
  const { pending, error, run } = useAction();
  return (
    <li className="flex flex-wrap items-center gap-2.5 py-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-fc-navy2 text-[12px] font-bold">
        {position ? faDigits(position) : name.slice(0, 1)}
      </span>
      <span className="min-w-0 flex-1">
        <b className="block truncate text-[13.5px]">{name}</b>
        {note && <small className="text-[11px] text-fc-warn">{note}</small>}
      </span>
      {pending && <Loader2 className="size-4 animate-spin text-fc-muted" />}
      {status === "attended" && <span className="fc-chip fc-chip-ok">حاضر</span>}
      {status === "no_show" && <span className="fc-chip fc-chip-bad">غایب</span>}
      {canMark && status === "booked" && (
        <>
          <button type="button" disabled={pending} onClick={() => run(() => setAttendance(sessionId, bookingId, "attended"))} className="fc-chip fc-chip-ok min-h-9" aria-label={`${name} حاضر`}>
            <Check className="size-4" />حاضر
          </button>
          <button type="button" disabled={pending} onClick={() => run(() => setAttendance(sessionId, bookingId, "no_show"))} className="fc-chip fc-chip-bad min-h-9" aria-label={`${name} غایب`}>
            <X className="size-4" />غایب
          </button>
        </>
      )}
      {canMark && (status === "attended" || status === "no_show") && (
        <button type="button" disabled={pending} onClick={() => run(() => setAttendance(sessionId, bookingId, "booked"))} className="fc-chip min-h-9" aria-label="برگرداندن">
          <Undo2 className="size-4" />
        </button>
      )}
      {(status === "booked" || status === "waitlisted") && (
        <button type="button" disabled={pending} onClick={() => run(() => staffRemoveFromClass(sessionId, studentId))} className="fc-chip min-h-9 hover:text-fc-bad" aria-label={`حذف ${name}`}>
          <Trash2 className="size-4" />
        </button>
      )}
      {error && <p role="alert" className="w-full text-[12px] text-fc-bad">{error}</p>}
    </li>
  );
}

export function AddMember({
  sessionId,
  students,
}: {
  sessionId: string;
  students: { id: string; full_name: string }[];
}) {
  const { pending, error, run } = useAction();
  const [studentId, setStudentId] = useState("");
  const [force, setForce] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  return (
    <div className="grid gap-2.5">
      <div className="flex gap-2">
        <select className="fc-input flex-1" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="انتخاب عضو">
          <option value="">انتخاب عضو…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        <button
          type="button"
          disabled={pending || !studentId}
          onClick={() => {
            setDone(null);
            run(() => staffAddToClass(sessionId, studentId, force), () => setDone("اضافه شد."));
          }}
          className="fc-btn shrink-0"
        >
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <UserPlus className="size-[18px]" />}
          افزودن
        </button>
      </div>
      <label className="flex items-center gap-2 text-[12.5px] text-fc-muted">
        <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)} className="size-4 accent-[var(--color-fc-cyan)]" />
        حتی اگر کلاس پر است یا اشتراکش تمام شده
      </label>
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
      {done && <p role="status" className="text-[12px] text-fc-ok">{done}</p>}
    </div>
  );
}

export function CapacityEditor({
  sessionId,
  capacity,
  inSeries,
}: {
  sessionId: string;
  capacity: number;
  inSeries: boolean;
}) {
  const { pending, error, run } = useAction();
  const [value, setValue] = useState(capacity);
  const [scope, setScope] = useState<"one" | "series">("one");
  return (
    <div className="grid gap-2.5">
      <div className="flex items-center gap-2">
        <Users className="size-4 shrink-0 text-fc-muted" />
        <input className="fc-input fc-num flex-1" type="number" min={1} max={200} value={value} onChange={(e) => setValue(Number(e.target.value))} aria-label="ظرفیت" />
        <button type="button" disabled={pending || value === capacity} onClick={() => run(() => setCapacity(sessionId, value, scope))} className="fc-btn fc-btn-ghost shrink-0">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
          ذخیره
        </button>
      </div>
      {inSeries && (
        <select className="fc-input" value={scope} onChange={(e) => setScope(e.target.value as "one" | "series")} aria-label="دامنه">
          <option value="one">فقط همین جلسه</option>
          <option value="series">این جلسه و جلسه‌های بعدی</option>
        </select>
      )}
      <p className="text-[11.5px] text-fc-muted">با بیشتر شدن ظرفیت، نفرات صف انتظار به ترتیب خودشان جا می‌گیرند.</p>
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
    </div>
  );
}

export function CancelClass({ sessionId, inSeries, booked }: { sessionId: string; inSeries: boolean; booked: number }) {
  const { pending, error, run } = useAction();
  const [confirm, setConfirm] = useState<"one" | "series" | null>(null);
  if (confirm) {
    return (
      <div className="grid gap-2 rounded-xl border border-fc-bad/40 bg-fc-bad/8 p-3.5">
        <p className="text-[13px]">
          {confirm === "series" ? "این جلسه و همه‌ی جلسه‌های بعدی لغو شوند؟" : "این جلسه لغو شود؟"}
          {booked > 0 && ` ${faDigits(booked)} نفر رزرو دارند و در اپ «لغو شد» را می‌بینند.`}
        </p>
        <div className="flex gap-2">
          <button type="button" disabled={pending} onClick={() => run(() => cancelClasses(sessionId, confirm))} className="fc-btn flex-1" style={{ background: "var(--color-fc-bad)" }}>
            {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Ban className="size-[18px]" />}
            بله، لغو شود
          </button>
          <button type="button" onClick={() => setConfirm(null)} className="fc-btn fc-btn-ghost">نه</button>
        </div>
        {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={() => setConfirm("one")} className="fc-btn fc-btn-ghost hover:!border-fc-bad hover:!text-fc-bad">
        <Ban className="size-[18px]" />لغو این جلسه
      </button>
      {inSeries && (
        <button type="button" onClick={() => setConfirm("series")} className="fc-btn fc-btn-ghost hover:!border-fc-bad hover:!text-fc-bad">
          لغو از این جلسه به بعد
        </button>
      )}
    </div>
  );
}
