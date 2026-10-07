import {
  Users, Snowflake, CalendarClock, UserMinus, Wallet, HandCoins, Repeat, CalendarDays, Flame,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { Kpi } from "@/components/reports/kpi";
import { RevenueChart, shortToman } from "@/components/reports/revenue-chart";
import { BusyMap } from "@/components/reports/busy-map";
import {
  attendanceGrid, change, classStats, memberCounts, renewalRate, revenueByMonth,
  type MembershipRow,
} from "@/lib/analytics";
import { faDigits, faNumber, sinceDaysAgo, todayInTehran } from "@/lib/format";

export const metadata = { title: "گزارش‌ها" };

const DAYS = ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"];

export default async function ReportsPage() {
  await requireProfile(); // the admin layout has already checked the role
  const supabase = await createClient();
  const now = new Date();
  const today = todayInTehran();

  const [
    { data: payments },
    { data: memberships },
    { data: checkins },
    { data: sessions },
    { data: ledger },
  ] = await Promise.all([
    supabase.from("payments").select("amount_toman, paid_at").gte("paid_at", sinceDaysAgo(200)).limit(20000),
    supabase.from("memberships").select("student_id, status, started_on, expires_on").limit(20000),
    supabase.from("checkins").select("at").eq("kind", "in").gte("at", sinceDaysAgo(28)).limit(20000),
    supabase
      .from("class_sessions")
      .select("title, capacity, cancelled_at, class_bookings(status)")
      .gte("starts_at", sinceDaysAgo(28))
      .lte("starts_at", now.toISOString())
      .limit(2000),
    supabase.from("membership_ledger").select("balance_toman").gt("balance_toman", 0).limit(20000),
  ]);

  const months = revenueByMonth((payments ?? []) as { amount_toman: number; paid_at: string }[], now, 6);
  const thisMonth = months[months.length - 1];
  const lastMonth = months[months.length - 2];
  const counts = memberCounts((memberships ?? []) as MembershipRow[], today);
  const renewal = renewalRate((memberships ?? []) as MembershipRow[], today);
  const busy = attendanceGrid((checkins ?? []) as { at: string }[]);
  const classes = classStats(
    ((sessions ?? []) as { title: string; capacity: number; cancelled_at: string | null; class_bookings: { status: string }[] | null }[]).map(
      (s) => ({ title: s.title, capacity: s.capacity, cancelled_at: s.cancelled_at, statuses: (s.class_bookings ?? []).map((b) => b.status) })
    )
  );
  const debt = ((ledger ?? []) as { balance_toman: number }[]).reduce((n, r) => n + Number(r.balance_toman), 0);
  const entries = (checkins ?? []).length;

  return (
    <div className="grid gap-6 py-5 pb-12">
      <header>
        <h1 className="text-lg">گزارش‌های باشگاه</h1>
        <p className="text-xs text-fc-muted">همه‌ی اعداد بر اساس تقویم شمسی و ساعت تهران است.</p>
      </header>

      <section aria-label="اعضا" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Users} label="اعضای فعال" value={faDigits(counts.active)} tone="ok" />
        <Kpi icon={CalendarClock} label="پایان تا ۷ روز" value={faDigits(counts.expiring)} hint="برای تمدید تماس بگیرید" tone="warn" />
        <Kpi icon={UserMinus} label="ریزش ۳۰ روز اخیر" value={faDigits(counts.lapsed)} hint="تمدید نکرده‌اند" tone="bad" />
        <Kpi icon={Snowflake} label="اشتراک متوقف" value={faDigits(counts.frozen)} />
      </section>

      <section aria-label="پول" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Kpi
          icon={Wallet}
          label={`دریافتی ${thisMonth.label}`}
          value={shortToman(thisMonth.total)}
          delta={change(thisMonth.total, lastMonth.total)}
          hint={`نسبت به ${lastMonth.label}`}
        />
        <Kpi icon={HandCoins} label="طلب معوق" value={shortToman(debt)} hint="مانده‌ی اشتراک‌ها" tone="warn" />
        <Kpi
          icon={Repeat}
          label="نرخ تمدید"
          value={renewal.rate === null ? "-" : `${faDigits(renewal.rate)}٪`}
          hint={renewal.eligible ? `${faDigits(renewal.renewed)} از ${faDigits(renewal.eligible)} اشتراک ۳ ماه اخیر` : "هنوز داده‌ی کافی نیست"}
          tone="ok"
        />
      </section>

      <section className="fc-raised p-5">
        <h2 className="mb-1 text-[15px]">درآمد ماهانه</h2>
        <p className="mb-3 text-[12px] text-fc-muted">
          پرداخت‌های ثبت‌شده در صندوق، بازپرداخت‌ها کم شده. {thisMonth.label}: {faNumber(thisMonth.total)} تومان.
        </p>
        <RevenueChart months={months} />
      </section>

      <section className="fc-raised p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[15px]">
          <Flame className="size-4 text-fc-warn" />
          ساعت‌های شلوغ
        </h2>
        <p className="mb-3 text-[12px] text-fc-muted">
          {entries === 0
            ? "در ۲۸ روز اخیر ورودی ثبت نشده است."
            : busy.peak
              ? `${faDigits(entries)} ورود در ۲۸ روز اخیر. شلوغ‌ترین ساعت: ${DAYS[busy.peak.weekday]} ساعت ${faDigits(busy.peak.hour)}.`
              : ""}
        </p>
        <BusyMap grid={busy.grid} max={busy.max} />
      </section>

      <section className="fc-raised p-5">
        <h2 className="mb-1 flex items-center gap-2 text-[15px]">
          <CalendarDays className="size-4 text-fc-cyan" />
          کلاس‌ها در ۲۸ روز اخیر
        </h2>
        {classes.sessions === 0 ? (
          <p className="text-[12.5px] text-fc-muted">هنوز کلاسی برگزار نشده است.</p>
        ) : (
          <>
            <p className="mb-4 text-[12px] text-fc-muted">
              {faDigits(classes.sessions)} جلسه، پرشدگی {faDigits(classes.fill ?? 0)}٪
              {classes.showUp !== null && `، ${faDigits(classes.showUp)}٪ رزروکننده‌ها آمدند`}
            </p>
            <ul className="grid list-none gap-3">
              {classes.ranking.slice(0, 8).map((c) => (
                <li key={c.title} className="grid gap-1.5">
                  <span className="flex items-baseline justify-between text-[13px]">
                    <b>{c.title}</b>
                    <span className="fc-num text-[12px] text-fc-muted">
                      {faDigits(c.fill)}٪، {faDigits(c.sessions)} جلسه
                    </span>
                  </span>
                  <div className="fc-bar" title={`${faDigits(c.taken)} از ${faDigits(c.seats)} جا`}>
                    <i style={{ width: `${c.fill}%`, background: "var(--color-fc-cyan)" }} />
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
