import Link from "next/link";
import { AlertCircle, Banknote, ChevronLeft, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { faDate, faDigits, faToman, todayInTehran } from "@/lib/format";

export const metadata = { title: "صندوق" };

type Method = "cash" | "card" | "transfer" | "other";

const METHOD_LABEL: Record<Method, string> = {
  cash: "نقدی",
  card: "کارتخوان",
  transfer: "کارت‌به‌کارت",
  other: "سایر",
};

/** Tehran runs at a fixed +03:30 and has not observed daylight saving
 *  since 2022, so the day boundary is a constant offset. Using the
 *  server's own midnight would close the till at 03:30 local. */
function tehranDayStart(day: string): string {
  return new Date(`${day}T00:00:00+03:30`).toISOString();
}

export default async function Money() {
  const supabase = await createClient();
  const today = todayInTehran();
  const startOfToday = tehranDayStart(today);

  const monthAgo = new Date(`${today}T00:00:00+03:30`);
  monthAgo.setDate(monthAgo.getDate() - 30);

  const [{ data: todays }, { data: recent }, { data: debts }] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_toman, method")
      .gte("paid_at", startOfToday),
    supabase
      .from("payments")
      .select("id, amount_toman, method, paid_at, note, student_id, profiles(full_name)")
      .gte("paid_at", monthAgo.toISOString())
      .order("paid_at", { ascending: false })
      .limit(40),
    supabase
      .from("membership_ledger")
      .select("membership_id, student_id, price_toman, paid_toman, balance_toman, expires_on")
      .eq("status", "active")
      .gt("balance_toman", 0),
  ]);

  const takings = ((todays ?? []) as { amount_toman: number; method: Method }[]).reduce(
    (acc, p) => {
      acc.total += Number(p.amount_toman);
      acc.by[p.method] = (acc.by[p.method] ?? 0) + Number(p.amount_toman);
      return acc;
    },
    { total: 0, by: {} as Partial<Record<Method, number>> }
  );

  const rows = (recent ?? []) as {
    id: string;
    amount_toman: number;
    method: Method;
    paid_at: string;
    note: string | null;
    student_id: string;
    profiles: { full_name: string } | { full_name: string }[] | null;
  }[];

  const month = rows.reduce((sum, r) => sum + Number(r.amount_toman), 0);

  // The ledger is a view, so PostgREST has no foreign key to embed the
  // member's name through. One extra round trip beats denormalising a
  // name into the view and watching it go stale.
  const owing = (debts ?? []) as {
    membership_id: string;
    student_id: string;
    price_toman: number;
    paid_toman: number;
    balance_toman: number;
    expires_on: string;
  }[];

  const { data: names } = owing.length
    ? await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", owing.map((o) => o.student_id))
    : { data: [] };

  const nameOf = new Map(
    ((names ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name])
  );

  const owedTotal = owing.reduce((sum, o) => sum + Number(o.balance_toman), 0);

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">صندوق</h1>
        <p className="text-xs text-fc-muted">
          پولی که واقعاً دریافت شده — نه قیمت پلن‌ها
        </p>
      </header>

      <section className="fc-raised p-5">
        <small className="text-[12px] text-fc-muted">دریافتی امروز</small>
        <b className="fc-lat fc-num mt-1 block text-[26px] font-extrabold text-fc-cyan">
          {faToman(takings.total)}
        </b>

        {takings.total !== 0 ? (
          <ul className="mt-3.5 grid list-none gap-1.5 p-0">
            {(Object.keys(METHOD_LABEL) as Method[])
              .filter((m) => takings.by[m])
              .map((m) => (
                <li key={m} className="flex items-baseline justify-between text-[12.5px]">
                  <span className="text-fc-muted">{METHOD_LABEL[m]}</span>
                  <b className="fc-num font-extrabold">{faToman(takings.by[m] ?? 0)}</b>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-2 text-[12.5px] text-fc-muted">
            امروز هنوز پرداختی ثبت نشده. پرداخت‌ها از پرونده‌ی هر عضو ثبت می‌شوند.
          </p>
        )}

        <p className="mt-3.5 border-t border-[var(--fc-line)] pt-3 text-[12.5px] text-fc-muted">
          سی روز گذشته:{" "}
          <b className="fc-num font-extrabold text-fc-text">{faToman(month)}</b>
        </p>
      </section>

      {owing.length > 0 && (
        <>
          <h2 className="mt-6 mb-1 flex items-center gap-2 text-[14.5px]">
            <AlertCircle className="size-4 text-fc-warn" />
            بدهکاران
          </h2>
          <p className="mb-3 text-[11.5px] text-fc-dim">
            {faDigits(owing.length)} عضو با اشتراک فعال، جمعاً{" "}
            <b className="fc-num text-fc-warn">{faToman(owedTotal)}</b> مانده دارند
          </p>
          <ul className="grid list-none gap-2 p-0">
            {owing
              .slice()
              .sort((a, b) => Number(b.balance_toman) - Number(a.balance_toman))
              .map((o) => (
                <li key={o.membership_id}>
                  <Link
                    href={`/coach/${o.student_id}`}
                    className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
                  >
                    <span className="min-w-0 flex-1">
                      <b className="block truncate text-[13px]">
                        {nameOf.get(o.student_id) ?? "عضو"}
                      </b>
                      <small className="fc-num text-[11px] text-fc-dim">
                        {faToman(Number(o.paid_toman))} از {faToman(Number(o.price_toman))}{" "}
                        پرداخت شده
                      </small>
                    </span>
                    <b className="fc-num shrink-0 text-[13.5px] font-extrabold text-fc-warn">
                      {faToman(Number(o.balance_toman))}
                    </b>
                    <ChevronLeft className="size-[18px] shrink-0 text-fc-dim" />
                  </Link>
                </li>
              ))}
          </ul>
        </>
      )}

      <h2 className="mt-6 mb-3 flex items-center gap-2 text-[14.5px]">
        <Banknote className="size-4 text-fc-cyan" />
        پرداخت‌های اخیر
      </h2>

      {rows.length === 0 ? (
        <div className="fc-card p-5">
          <Wallet className="mb-2.5 size-8 text-fc-dim" />
          <h3 className="mb-1.5 text-[14px]">هنوز پرداختی ثبت نشده</h3>
          <p className="text-[12.5px] leading-relaxed text-fc-muted">
            پرداخت‌ها از پرونده‌ی هر عضو ثبت می‌شوند: پنل مربی ← اسم عضو ← کادر
            «پرداخت‌ها». مبلغ توافقی روی اشتراک می‌نشیند و هر قسط جداگانه ثبت
            می‌شود، پس مانده‌ی هر نفر همیشه معلوم است.
          </p>
        </div>
      ) : (
        <ul className="grid list-none gap-2 p-0">
          {rows.map((r) => {
            const who = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
            return (
              <li key={r.id}>
                <Link
                  href={`/coach/${r.student_id}`}
                  className="fc-card flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:border-[var(--fc-line2)]"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-[12.5px]">
                      {who?.full_name ?? "عضو"}
                    </b>
                    <small className="fc-num text-[10.5px] text-fc-dim">
                      {faDate(r.paid_at)} · {METHOD_LABEL[r.method]}
                      {r.note ? ` · ${r.note}` : ""}
                    </small>
                  </span>
                  <b
                    className={`fc-num shrink-0 text-[13px] font-extrabold ${
                      Number(r.amount_toman) < 0 ? "text-fc-bad" : "text-fc-text"
                    }`}
                  >
                    {Number(r.amount_toman) < 0 ? "−" : ""}
                    {faToman(Math.abs(Number(r.amount_toman)))}
                  </b>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="h-6" />
    </>
  );
}
