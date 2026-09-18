"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Nfc, Plus, PowerOff, RotateCcw } from "lucide-react";
import { issueCard, setCardActive } from "@/app/admin/actions";
import { faDate, faDigits } from "@/lib/format";

export interface CardRow {
  id: string;
  uid: string;
  label: string | null;
  active: boolean;
  issuedAt: string;
  studentName: string;
}

export interface StudentOption {
  id: string;
  full_name: string;
}

export function CardRegister({
  rows,
  students,
}: {
  rows: CardRow[];
  students: StudentOption[];
}) {
  const [adding, setAdding] = useState(false);
  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [uid, setUid] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function add() {
    setError(null);
    startTransition(async () => {
      const result = await issueCard(studentId, uid, label);
      if (!result.ok) {
        setError(result.message ?? "ثبت نشد.");
        return;
      }
      setUid("");
      setLabel("");
      setAdding(false);
      router.refresh();
    });
  }

  function toggle(card: CardRow) {
    setError(null);
    startTransition(async () => {
      const result = await setCardActive(card.id, !card.active);
      if (!result.ok) setError(result.message ?? "تغییر نشد.");
      else router.refresh();
    });
  }

  return (
    <>
      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      {adding ? (
        <div className="fc-card mb-3 grid gap-3 p-4">
          <div>
            <label htmlFor="card-student" className="mb-1.5 block text-[12.5px] text-fc-muted">
              برای کدام عضو
            </label>
            <select
              id="card-student"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="fc-input"
              style={{ fontSize: 16 }}
            >
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="card-uid" className="mb-1.5 block text-[12.5px] text-fc-muted">
              شماره‌ی کارت
            </label>
            <input
              id="card-uid"
              dir="ltr"
              value={uid}
              onChange={(e) => setUid(e.target.value)}
              placeholder="04A2B7C1D3"
              className="fc-input fc-lat text-start"
              style={{ fontSize: 16 }}
            />
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-fc-muted">
              کارت را روی دستگاه درب بگیرید و همان عددی که نشان می‌دهد را
              بنویسید. حروف کوچک و بزرگ فرقی نمی‌کند.
            </p>
          </div>

          <div>
            <label htmlFor="card-label" className="mb-1.5 block text-[12.5px] text-fc-muted">
              برچسب (اختیاری)
            </label>
            <input
              id="card-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثلاً کارت ۰۴۲۷"
              className="fc-input"
              style={{ fontSize: 16 }}
            />
          </div>

          <div className="flex gap-2.5">
            <button type="button" disabled={pending} onClick={add} className="fc-btn flex-1">
              {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Plus className="size-[18px]" />}
              ثبت کارت
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="fc-btn fc-btn-ghost shrink-0"
            >
              انصراف
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={students.length === 0}
          className="fc-btn mb-3 w-full"
        >
          <Plus className="size-[18px]" />
          ثبت کارت تازه
        </button>
      )}

      {rows.length === 0 ? (
        <p className="fc-card p-4 text-[13px] text-fc-muted">هنوز کارتی ثبت نشده.</p>
      ) : (
        <ul className="grid list-none gap-2.5 p-0">
          {rows.map((card) => (
            <li
              key={card.id}
              className={`fc-card flex items-center gap-3 p-3.5 ${card.active ? "" : "opacity-60"}`}
            >
              <span
                className={`grid size-11 shrink-0 place-items-center rounded-xl border ${
                  card.active
                    ? "border-fc-cyan/40 bg-fc-cyan/10 text-fc-cyan"
                    : "border-[var(--fc-line2)] text-fc-dim"
                }`}
              >
                <Nfc className="size-[18px]" />
              </span>

              <div className="min-w-0 flex-1">
                <b className="block text-[13.5px]">{card.studentName}</b>
                <small dir="ltr" className="fc-lat block text-start text-[11px] text-fc-dim">
                  {card.uid}
                </small>
                <small className="block text-[11px] text-fc-dim">
                  {card.label ? `${card.label} · ` : ""}
                  {faDate(card.issuedAt)}
                </small>
              </div>

              {!card.active && <span className="fc-chip shrink-0">غیرفعال</span>}

              <button
                type="button"
                disabled={pending}
                onClick={() => toggle(card)}
                aria-label={`${card.active ? "غیرفعال‌کردن" : "فعال‌کردن"} کارت ${card.studentName}`}
                className={`grid size-9 shrink-0 place-items-center rounded-lg transition-colors ${
                  card.active ? "text-fc-dim hover:text-fc-bad" : "text-fc-dim hover:text-fc-ok"
                }`}
              >
                {card.active ? <PowerOff className="size-4" /> : <RotateCcw className="size-4" />}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-[11.5px] text-fc-muted">
        {faDigits(rows.filter((r) => r.active).length)} کارت فعال از{" "}
        {faDigits(rows.length)} کارت ثبت‌شده.
      </p>
    </>
  );
}
