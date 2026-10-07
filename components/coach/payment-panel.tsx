"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, Loader2, Pencil, Trash2, Wallet } from "lucide-react";
import {
  recordPayment,
  deletePayment,
  setMembershipPrice,
  type PaymentMethod,
} from "@/app/coach/actions";
import { faDate, faDigits, faToman } from "@/lib/format";

export interface PaymentRow {
  id: string;
  amountToman: number;
  method: PaymentMethod;
  paidAt: string;
  note: string | null;
  recordedBy: string | null;
}

export interface Ledger {
  membershipId: string;
  planName: string;
  priceToman: number;
  paidToman: number;
  balanceToman: number;
}

const METHOD: { key: PaymentMethod; label: string }[] = [
  { key: "cash", label: "نقدی" },
  { key: "card", label: "کارتخوان" },
  { key: "transfer", label: "کارت‌به‌کارت" },
  { key: "other", label: "سایر" },
];

const METHOD_LABEL = Object.fromEntries(METHOD.map((m) => [m.key, m.label])) as Record<
  PaymentMethod,
  string
>;

/** What was agreed, what came in, and what is still owed.
 *
 *  The two numbers are kept apart on purpose. A member who was quoted
 *  four million and has paid two is not the same as a member on a
 *  two-million plan, and a single "paid" flag cannot tell them apart —
 *  which is exactly the thing the notebook on the desk was for.
 */
export function PaymentPanel({
  studentId,
  ledger,
  payments,
  today,
}: {
  studentId: string;
  /** Null when the member has no subscription — the desk can still
   *  take money for a locker or a single session. */
  ledger: Ledger | null;
  payments: PaymentRow[];
  today: string;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("cash");
  const [note, setNote] = useState("");
  const [paidOn, setPaidOn] = useState(today);
  const [backdate, setBackdate] = useState(false);

  const [editingPrice, setEditingPrice] = useState(false);
  const [price, setPrice] = useState(ledger ? String(ledger.priceToman) : "");

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; message?: string }>, done: string) {
    setError(null);
    setSaved(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.message ?? "انجام نشد.");
        return;
      }
      setSaved(done);
      router.refresh();
    });
  }

  const owed = ledger?.balanceToman ?? 0;

  return (
    <section className="fc-raised p-5">
      <h2 className="mb-3 flex items-center gap-2 text-[14.5px]">
        <Wallet className="size-4 text-fc-cyan" />
        پرداخت‌ها
      </h2>

      {ledger ? (
        <>
          <dl className="grid gap-2 border-b border-[var(--fc-line)] pb-3.5">
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">مبلغ توافقی ({ledger.planName})</dt>
              <dd className="flex items-center gap-2">
                <b className="fc-num text-[13.5px] font-extrabold">
                  {faToman(ledger.priceToman)}
                </b>
                <button
                  type="button"
                  onClick={() => setEditingPrice((v) => !v)}
                  aria-label="تغییر مبلغ توافقی"
                  className="grid size-7 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-cyan"
                >
                  <Pencil className="size-3.5" />
                </button>
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">دریافت‌شده</dt>
              <dd className="fc-num text-[13.5px] font-extrabold text-fc-ok">
                {faToman(ledger.paidToman)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between text-[13px]">
              <dt className="text-fc-muted">{owed > 0 ? "مانده" : owed < 0 ? "اضافه‌پرداخت" : "تسویه"}</dt>
              <dd
                className={`fc-num text-[14.5px] font-extrabold ${
                  owed > 0 ? "text-fc-warn" : owed < 0 ? "text-fc-cyan" : "text-fc-ok"
                }`}
              >
                {owed === 0 ? "تسویه شده" : faToman(Math.abs(owed))}
              </dd>
            </div>
          </dl>

          {editingPrice && (
            <div className="mt-3 flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <label htmlFor="price" className="mb-1.5 block text-[11.5px] text-fc-dim">
                  مبلغ توافقی (تومان)
                </label>
                <input
                  id="price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={10000}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  dir="ltr"
                  className="fc-input text-center"
                  style={{ fontSize: 16 }}
                />
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  run(
                    () => setMembershipPrice(ledger.membershipId, studentId, Number(price)),
                    "مبلغ توافقی به‌روز شد."
                  )
                }
                className="fc-btn fc-btn-ghost shrink-0"
              >
                ثبت
              </button>
            </div>
          )}
        </>
      ) : (
        <p className="border-b border-[var(--fc-line)] pb-3.5 text-[12.5px] leading-relaxed text-fc-muted">
          این عضو اشتراک فعالی ندارد. پرداختی که اینجا ثبت کنید به هیچ اشتراکی
          بسته نمی‌شود، برای کمد، جلسه‌ی تکی یا فروش مکمل مناسب است.
        </p>
      )}

      {/* ---- new payment ---- */}
      <div className="mt-4">
        <label htmlFor="amount" className="mb-1.5 block text-[12px] text-fc-dim">
          مبلغ دریافتی (تومان)، برای عودت، عدد منفی بنویسید
        </label>
        <input
          id="amount"
          type="number"
          inputMode="numeric"
          step={10000}
          value={amount}
          onChange={(e) => {
            setAmount(e.target.value);
            setSaved(null);
          }}
          placeholder="۰"
          dir="ltr"
          className="fc-input text-center"
          style={{ fontSize: 16 }}
          aria-invalid={!!error}
        />

        <fieldset className="mt-3">
          <legend className="mb-1.5 text-[12px] text-fc-dim">روش پرداخت</legend>
          <div className="flex flex-wrap gap-1.5">
            {METHOD.map((m) => (
              <button
                key={m.key}
                type="button"
                onClick={() => setMethod(m.key)}
                aria-pressed={method === m.key}
                className={`fc-chip transition-colors ${
                  method === m.key ? "fc-chip-cy" : "hover:text-fc-text"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </fieldset>

        <label htmlFor="pnote" className="mt-3 mb-1.5 block text-[12px] text-fc-dim">
          توضیح (اختیاری)
        </label>
        <input
          id="pnote"
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="مثلاً قسط اول، یا فروش شیکر"
          className="fc-input"
          style={{ fontSize: 16 }}
        />

        {backdate && (
          <div className="mt-3">
            <label htmlFor="paidOn" className="mb-1.5 block text-[12px] text-fc-dim">
              تاریخ دریافت
            </label>
            <input
              id="paidOn"
              type="date"
              value={paidOn}
              max={today}
              onChange={(e) => setPaidOn(e.target.value)}
              dir="ltr"
              className="fc-input text-center"
              style={{ fontSize: 16 }}
            />
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            disabled={pending || amount.trim() === ""}
            onClick={() =>
              run(
                () =>
                  recordPayment(studentId, {
                    membershipId: ledger?.membershipId ?? null,
                    amountToman: Number(amount),
                    method,
                    note,
                    paidOn: backdate ? paidOn : undefined,
                  }),
                "پرداخت ثبت شد."
              )
            }
            className="fc-btn flex-1"
          >
            {pending ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <Banknote className="size-[18px]" />
            )}
            ثبت پرداخت
          </button>
          <button
            type="button"
            onClick={() => setBackdate((v) => !v)}
            className="fc-chip shrink-0 transition-colors hover:text-fc-cyan"
          >
            {backdate ? "امروز" : "تاریخ دیگر"}
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-fc-ok">
          <Check className="size-4" />
          {saved}
        </p>
      )}

      {/* ---- history ---- */}
      {payments.length > 0 && (
        <>
          <h3 className="mt-5 mb-2.5 text-[13.5px]">سابقه‌ی پرداخت</h3>
          <ul className="grid list-none gap-2 p-0">
            {payments.map((p) => (
              <li key={p.id} className="fc-card flex items-center gap-2.5 px-3 py-2.5">
                <span className="min-w-0 flex-1">
                  <b className="fc-num block text-[12.5px]">
                    {faDate(p.paidAt)} · {METHOD_LABEL[p.method]}
                  </b>
                  {p.note && (
                    <small className="block truncate text-[10.5px] text-fc-dim">{p.note}</small>
                  )}
                </span>
                <b
                  className={`fc-num shrink-0 text-[13px] font-extrabold ${
                    p.amountToman < 0 ? "text-fc-bad" : "text-fc-text"
                  }`}
                >
                  {p.amountToman < 0 ? "−" : ""}
                  {faToman(Math.abs(p.amountToman))}
                </b>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() =>
                    run(() => deletePayment(p.id, studentId), "پرداخت حذف شد.")
                  }
                  aria-label={`حذف پرداخت ${faDigits(Math.abs(p.amountToman))} تومان`}
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-fc-dim transition-colors hover:text-fc-bad"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
