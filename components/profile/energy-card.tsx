import Link from "next/link";
import { ChevronLeft, Flame, Utensils } from "lucide-react";
import { faNumber } from "@/lib/format";
import { balanceVerdict, type EnergyDay } from "@/lib/energy";
import { GOAL_LABEL } from "@/lib/nutrition";

/** Today in two numbers: what to eat, and what the body spends. The
 *  member's attention belongs on the gap between them, so the gap is the
 *  biggest thing on the card. */
export function EnergyCard({ day, goal }: { day: EnergyDay; goal: "gain" | "lose" | "maintain" }) {
  const verdict = balanceVerdict(day.balance, goal);
  const max = Math.max(day.target, day.totalOut);
  const pct = (v: number) => `${Math.max(4, Math.round((v / max) * 100))}%`;

  return (
    <section className="fc-raised p-5">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-[15px]">انرژی امروز</h2>
        <span className="text-[11.5px] text-fc-muted">هدف: {GOAL_LABEL[goal]}</span>
      </div>

      <p className="mb-1 text-[12px] text-fc-muted">تراز کالری</p>
      <p className="mb-1 flex items-baseline gap-1.5">
        <b className={`fc-num text-[34px] leading-none font-black ${verdict.tone === "ok" ? "text-fc-ok" : "text-fc-accent"}`} dir="ltr">
          {day.balance > 0 ? "+" : day.balance < 0 ? "−" : ""}
          {faNumber(Math.abs(day.balance))}
        </b>
        <small className="text-[12px] text-fc-muted">کالری</small>
      </p>
      <p className="mb-5 text-[12.5px] text-fc-muted">{verdict.text}</p>

      <div className="grid gap-3">
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-1.5 font-bold"><Utensils className="size-4 text-fc-cyan" /> دریافت هدف</span>
            <b className="fc-num">{faNumber(day.target)}</b>
          </div>
          <div className="fc-bar h-2.5"><i style={{ width: pct(day.target), background: "var(--color-fc-cyan)" }} /></div>
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between text-[12.5px]">
            <span className="flex items-center gap-1.5 font-bold"><Flame className="size-4 text-fc-accent" /> مصرف امروز</span>
            <b className="fc-num">{faNumber(day.totalOut)}</b>
          </div>
          <div className="fc-bar h-2.5 flex">
            <i style={{ width: pct(day.baseline), background: "color-mix(in srgb, var(--fc-accent-fill) 55%, var(--fc-line2))", borderRadius: 0 }} />
            <i style={{ width: day.gymBurn ? pct(day.gymBurn) : "0%", background: "var(--fc-accent-fill)", borderRadius: 0 }} />
          </div>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl bg-fc-navy2/40 px-2 py-2.5">
          <dt className="text-[10.5px] text-fc-muted">سوخت پایه</dt>
          <dd className="fc-num text-[14px] font-extrabold">{faNumber(day.bmr)}</dd>
          <dd className="text-[10px] text-fc-dim">{day.bmrSource === "analyzer" ? "از دستگاه آنالیز" : "تخمینی"}</dd>
        </div>
        <div className="rounded-xl bg-fc-navy2/40 px-2 py-2.5">
          <dt className="text-[10.5px] text-fc-muted">فعالیت روزمره</dt>
          <dd className="fc-num text-[14px] font-extrabold">{faNumber(day.baseline - day.bmr)}</dd>
        </div>
        <div className="rounded-xl bg-fc-navy2/40 px-2 py-2.5">
          <dt className="text-[10.5px] text-fc-muted">در باشگاه</dt>
          <dd className="fc-num text-[14px] font-extrabold text-fc-accent">{faNumber(day.gymBurn)}</dd>
        </div>
      </dl>

      <Link href="/app/nutrition" className="mt-4 flex items-center justify-center gap-1 text-[12.5px] font-bold text-fc-cyan">
        برنامه‌ی غذایی و وعده‌ها
        <ChevronLeft className="size-4" />
      </Link>
    </section>
  );
}
