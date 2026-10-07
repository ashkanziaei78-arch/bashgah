"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2, UserPlus, Send, Flag, Ban, Undo2 } from "lucide-react";
import {
  addParticipant, deleteEvent, deleteResult, saveResult, setEventStatus, setRegistrationStatus,
} from "@/app/admin/events/actions";
import { formatScore, type EventStatus, type ScoreKind } from "@/lib/events";
import { faDigits } from "@/lib/format";

function useRun() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (fn: () => Promise<{ ok: boolean; message?: string }>, onOk?: () => void) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.message ?? "انجام نشد.");
      else onOk?.();
    });
  };
  return { pending, error, run };
}

export function StatusBar({ id, status }: { id: string; status: EventStatus }) {
  const { pending, error, run } = useRun();
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "draft" && (
          <button type="button" disabled={pending} onClick={() => run(() => setEventStatus(id, "published"))} className="fc-btn">
            <Send className="size-[18px]" />انتشار برای اعضا
          </button>
        )}
        {status === "published" && (
          <button type="button" disabled={pending} onClick={() => run(() => setEventStatus(id, "finished"))} className="fc-btn">
            <Flag className="size-[18px]" />برگزار شد
          </button>
        )}
        {status === "finished" && (
          <button type="button" disabled={pending} onClick={() => run(() => setEventStatus(id, "published"))} className="fc-btn fc-btn-ghost">
            <Undo2 className="size-[18px]" />بازگشت به در جریان
          </button>
        )}
        {status !== "cancelled" && status !== "finished" && (
          <button type="button" disabled={pending} onClick={() => run(() => setEventStatus(id, "cancelled"))} className="fc-btn fc-btn-ghost hover:!border-fc-bad hover:!text-fc-bad">
            <Ban className="size-[18px]" />لغو رویداد
          </button>
        )}
        {!confirmDelete ? (
          <button type="button" onClick={() => setConfirmDelete(true)} className="fc-btn fc-btn-ghost ms-auto" aria-label="حذف رویداد">
            <Trash2 className="size-[18px]" />
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => deleteEvent(id), () => router.push("/admin/events"))}
            className="fc-btn ms-auto" style={{ background: "var(--color-fc-bad)" }}>
            حذف کامل، با نتایج
          </button>
        )}
      </div>
      {pending && <Loader2 className="size-4 animate-spin text-fc-muted" />}
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
    </div>
  );
}

/** One athlete: attendance, and for a competition their score. */
export function ParticipantRow({
  eventId,
  registrationId,
  studentId,
  name,
  division,
  status,
  competition,
  scoreKind,
  score,
  note,
}: {
  eventId: string;
  registrationId: string;
  studentId: string;
  name: string;
  division: string | null;
  status: "registered" | "attended" | "cancelled";
  competition: boolean;
  scoreKind: ScoreKind;
  score: number | null;
  note: string | null;
}) {
  const { pending, error, run } = useRun();
  const [value, setValue] = useState(score === null ? "" : formatScore(scoreKind, score).split(" ")[0]);
  const [memo, setMemo] = useState(note ?? "");
  return (
    <li className="grid gap-2 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <b className="min-w-0 flex-1 truncate text-[13.5px]">
          {name}
          {division && <span className="ms-2 text-[11.5px] font-medium text-fc-muted">{division}</span>}
        </b>
        {status === "attended" ? (
          <button type="button" disabled={pending} onClick={() => run(() => setRegistrationStatus(eventId, registrationId, "registered"))} className="fc-chip fc-chip-ok min-h-9">
            <Check className="size-4" />حاضر
          </button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => setRegistrationStatus(eventId, registrationId, "attended"))} className="fc-chip min-h-9">
            حضور
          </button>
        )}
        <button type="button" disabled={pending} onClick={() => run(() => setRegistrationStatus(eventId, registrationId, "cancelled"))} className="fc-chip min-h-9 hover:text-fc-bad" aria-label={`حذف ${name}`}>
          <Trash2 className="size-4" />
        </button>
      </div>
      {competition && scoreKind !== "none" && (
        <div className="flex gap-2">
          <input className="fc-input fc-num w-32" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder={scoreKind === "time" ? "12:34" : "0"} aria-label={`امتیاز ${name}`} />
          <input className="fc-input flex-1" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="یادداشت (اختیاری)" maxLength={200} />
          <button type="button" disabled={pending || !value.trim()} onClick={() => run(() => saveResult(eventId, studentId, division, scoreKind, value, memo))} className="fc-btn shrink-0 px-4">
            {pending ? <Loader2 className="size-4 animate-spin" /> : "ثبت"}
          </button>
          {score !== null && (
            <button type="button" disabled={pending} onClick={() => run(() => deleteResult(eventId, studentId))} className="fc-btn fc-btn-ghost shrink-0 px-3" aria-label="حذف نتیجه">
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      )}
      {score !== null && <p className="text-[11.5px] text-fc-ok">ثبت‌شده: {faDigits(formatScore(scoreKind, score))}</p>}
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
    </li>
  );
}

export function AddParticipant({
  eventId,
  students,
  divisions,
}: {
  eventId: string;
  students: { id: string; full_name: string }[];
  divisions: string[];
}) {
  const { pending, error, run } = useRun();
  const [studentId, setStudentId] = useState("");
  const [division, setDivision] = useState(divisions[0] ?? "");
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap gap-2">
        <select className="fc-input min-w-40 flex-1" value={studentId} onChange={(e) => setStudentId(e.target.value)} aria-label="عضو">
          <option value="">انتخاب عضو…</option>
          {students.map((s) => <option key={s.id} value={s.id}>{s.full_name}</option>)}
        </select>
        {divisions.length > 0 && (
          <select className="fc-input w-auto" value={division} onChange={(e) => setDivision(e.target.value)} aria-label="رده">
            {divisions.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <button type="button" disabled={pending || !studentId} onClick={() => run(() => addParticipant(eventId, studentId, division || null), () => setStudentId(""))} className="fc-btn shrink-0">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <UserPlus className="size-[18px]" />}
          افزودن
        </button>
      </div>
      {error && <p role="alert" className="text-[12px] text-fc-bad">{error}</p>}
    </div>
  );
}
