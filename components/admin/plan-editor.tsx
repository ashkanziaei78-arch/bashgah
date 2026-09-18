"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Check, Infinity as InfinityIcon, Loader2, Pencil, Plus, X } from "lucide-react";
import { savePlan, retirePlan, type PlanInput } from "@/app/admin/actions";
import { faDigits, faToman } from "@/lib/format";

export interface PlanRow extends PlanInput {
  id: string;
  activeMembers: number;
}

const KINDS = [
  { value: "basic", label: "پایه" },
  { value: "pro", label: "حرفه‌ای" },
  { value: "vip", label: "VIP" },
] as const;

const BLANK: PlanInput = {
  name: "",
  kind: "basic",
  priceToman: 4_000_000,
  durationDays: 30,
  sessionsTotal: 12,
  perks: [],
  isActive: true,
};

export function PlanEditor({ rows }: { rows: PlanRow[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<PlanInput>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function open(row: PlanRow | null) {
    setError(null);
    if (row) {
      setEditing(row.id);
      setDraft({
        name: row.name,
        kind: row.kind,
        priceToman: row.priceToman,
        durationDays: row.durationDays,
        sessionsTotal: row.sessionsTotal,
        perks: row.perks,
        isActive: row.isActive,
      });
    } else {
      setEditing("new");
      setDraft(BLANK);
    }
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await savePlan(editing === "new" ? null : editing, draft);
      if (!result.ok) {
        setError(result.message ?? "ذخیره نشد.");
        return;
      }
      setEditing(null);
      router.refresh();
    });
  }

  function retire(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await retirePlan(id);
      if (!result.ok) setError(result.message ?? "بایگانی نشد.");
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

      <ul className="grid list-none gap-2.5 p-0">
        {rows.map((row) => (
          <li key={row.id} className={`fc-card p-4 ${row.isActive ? "" : "opacity-60"}`}>
            {editing === row.id ? (
              <PlanForm
                draft={draft}
                setDraft={setDraft}
                pending={pending}
                onSave={submit}
                onCancel={() => setEditing(null)}
              />
            ) : (
              <>
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <b className="flex items-center gap-2 text-[14px]">
                      {row.name}
                      {!row.isActive && <span className="fc-chip">بایگانی</span>}
                    </b>
                    <span className="fc-lat fc-num mt-1 block text-[17px] font-extrabold text-fc-cyan">
                      {faToman(row.priceToman)}
                    </span>
                    <small className="mt-0.5 block text-[11.5px] text-fc-dim">
                      {faDigits(row.durationDays)} روز ·{" "}
                      {row.sessionsTotal === null
                        ? "ورود نامحدود"
                        : `${faDigits(row.sessionsTotal)} جلسه`}
                      {row.activeMembers > 0 &&
                        ` · ${faDigits(row.activeMembers)} عضو فعال`}
                    </small>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => open(row)}
                      aria-label={`ویرایش ${row.name}`}
                      className="grid size-9 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-cyan"
                    >
                      <Pencil className="size-4" />
                    </button>
                    {row.isActive && (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => retire(row.id)}
                        aria-label={`بایگانی ${row.name}`}
                        className="grid size-9 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-warn"
                      >
                        <Archive className="size-4" />
                      </button>
                    )}
                  </div>
                </div>

                {row.perks.length > 0 && (
                  <ul className="mt-2.5 grid list-none gap-1 p-0">
                    {row.perks.map((perk) => (
                      <li
                        key={perk}
                        className="flex items-start gap-1.5 text-[12px] text-fc-muted"
                      >
                        <Check className="mt-0.5 size-3 shrink-0 text-fc-ok" />
                        {perk}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </li>
        ))}
      </ul>

      {editing === "new" ? (
        <div className="fc-card mt-2.5 p-4">
          <PlanForm
            draft={draft}
            setDraft={setDraft}
            pending={pending}
            onSave={submit}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <button type="button" onClick={() => open(null)} className="fc-btn fc-btn-ghost mt-3 w-full">
          <Plus className="size-[18px]" />
          پلن تازه
        </button>
      )}
    </>
  );
}

function PlanForm({
  draft,
  setDraft,
  pending,
  onSave,
  onCancel,
}: {
  draft: PlanInput;
  setDraft: (next: PlanInput) => void;
  pending: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  const unlimited = draft.sessionsTotal === null;

  return (
    <div className="grid gap-3">
      <div>
        <label htmlFor="plan-name" className="mb-1.5 block text-[12.5px] text-fc-muted">
          نام پلن
        </label>
        <input
          id="plan-name"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          placeholder="مثلاً حرفه‌ای"
          className="fc-input"
          style={{ fontSize: 16 }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div>
          <label htmlFor="plan-kind" className="mb-1.5 block text-[12.5px] text-fc-muted">
            رده
          </label>
          <select
            id="plan-kind"
            value={draft.kind}
            onChange={(e) => setDraft({ ...draft, kind: e.target.value as PlanInput["kind"] })}
            className="fc-input"
            style={{ fontSize: 16 }}
          >
            {KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="plan-days" className="mb-1.5 block text-[12.5px] text-fc-muted">
            مدت (روز)
          </label>
          <input
            id="plan-days"
            type="number"
            inputMode="numeric"
            min={1}
            max={3650}
            value={draft.durationDays}
            onChange={(e) => setDraft({ ...draft, durationDays: Number(e.target.value) })}
            className="fc-input fc-lat text-center"
            style={{ fontSize: 16 }}
          />
        </div>
      </div>

      <div>
        <label htmlFor="plan-price" className="mb-1.5 block text-[12.5px] text-fc-muted">
          قیمت (تومان)
        </label>
        <input
          id="plan-price"
          type="number"
          inputMode="numeric"
          min={0}
          step={100000}
          value={draft.priceToman}
          onChange={(e) => setDraft({ ...draft, priceToman: Number(e.target.value) })}
          className="fc-input fc-lat"
          style={{ fontSize: 16 }}
        />
      </div>

      <div>
        <span className="mb-1.5 block text-[12.5px] text-fc-muted">تعداد جلسه</span>
        <div className="flex items-center gap-2.5">
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={1000}
            disabled={unlimited}
            value={draft.sessionsTotal ?? ""}
            placeholder="—"
            aria-label="تعداد جلسه در ماه"
            onChange={(e) => setDraft({ ...draft, sessionsTotal: Number(e.target.value) })}
            className="fc-input fc-lat flex-1 text-center disabled:opacity-45"
            style={{ fontSize: 16 }}
          />
          <button
            type="button"
            onClick={() => setDraft({ ...draft, sessionsTotal: unlimited ? 12 : null })}
            aria-pressed={unlimited}
            className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-2.5 text-[12px] font-bold transition-colors ${
              unlimited
                ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan"
                : "border-[var(--fc-line2)] text-fc-muted"
            }`}
          >
            <InfinityIcon className="size-3.5" />
            نامحدود
          </button>
        </div>
      </div>

      <div>
        <label htmlFor="plan-perks" className="mb-1.5 block text-[12.5px] text-fc-muted">
          امکانات — هر خط یک مورد
        </label>
        <textarea
          id="plan-perks"
          rows={4}
          value={draft.perks.join("\n")}
          onChange={(e) => setDraft({ ...draft, perks: e.target.value.split("\n") })}
          placeholder={"دسترسی به سالن بدنسازی\nبرنامه اختصاصی از مربی"}
          className="fc-input resize-y"
          style={{ fontSize: 16 }}
        />
      </div>

      <label className="flex items-center gap-2.5 text-[13px]">
        <input
          type="checkbox"
          checked={draft.isActive}
          onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })}
          className="size-4 accent-[var(--color-fc-cyan)]"
        />
        در صفحه‌ی اصلی سایت نمایش داده شود
      </label>

      <div className="flex gap-2.5">
        <button type="button" disabled={pending} onClick={onSave} className="fc-btn flex-1">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Check className="size-[18px]" />}
          ذخیره
        </button>
        <button type="button" onClick={onCancel} className="fc-btn fc-btn-ghost shrink-0">
          <X className="size-[18px]" />
          انصراف
        </button>
      </div>
    </div>
  );
}
