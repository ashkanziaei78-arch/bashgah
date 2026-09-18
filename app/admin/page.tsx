import Link from "next/link";
import { CreditCard, Dumbbell, Nfc, TrendingUp, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getSetting } from "@/lib/data";
import { CheckinToggle } from "@/components/admin/checkin-toggle";
import { faDigits, faNumber, faToman, sinceDaysAgo } from "@/lib/format";

export const metadata = { title: "نمای کلی" };

export default async function AdminOverview() {
  const supabase = await createClient();
  const checkinOn = await getSetting<boolean>("checkin_module_enabled", true);

  // `head: true` asks PostgREST for the count without shipping the rows —
  // this page needs seven numbers, not seven tables.
  const HEAD = { count: "exact" as const, head: true };

  const [members, coaches, activeMemberships, exercises, plans, cards, recentTaps, revenue] =
    await Promise.all([
      supabase.from("profiles").select("id", HEAD).eq("role", "student"),
      supabase.from("profiles").select("id", HEAD).in("role", ["coach", "admin"]),
      supabase.from("memberships").select("id", HEAD).eq("status", "active"),
      supabase.from("exercises").select("id", HEAD),
      supabase.from("plans").select("id", HEAD).eq("is_active", true),
      supabase.from("cards").select("id", HEAD).eq("active", true),
      supabase.from("checkins").select("id", HEAD).gte("at", sinceDaysAgo(7)),
      supabase.from("memberships").select("plans(price_toman)").eq("status", "active"),
    ]);

  // What the active memberships are worth, as a plain sum of what each
  // member is currently on. Not a forecast — just the running total.
  const monthly = (
    (revenue.data ?? []) as { plans: { price_toman: number } | { price_toman: number }[] | null }[]
  ).reduce((sum, row) => {
    const plan = Array.isArray(row.plans) ? row.plans[0] : row.plans;
    return sum + (plan?.price_toman ?? 0);
  }, 0);

  const stats = [
    { label: "عضو", value: members.count ?? 0, icon: Users, href: "/admin/members" },
    { label: "اشتراک فعال", value: activeMemberships.count ?? 0, icon: TrendingUp, href: "/admin/members" },
    { label: "مربی و مدیر", value: coaches.count ?? 0, icon: Users, href: "/admin/members" },
    { label: "حرکت در کتابخانه", value: exercises.count ?? 0, icon: Dumbbell, href: "/admin/exercises" },
    { label: "پلن فعال", value: plans.count ?? 0, icon: CreditCard, href: "/admin/plans" },
    { label: "کارت فعال", value: cards.count ?? 0, icon: Nfc, href: "/admin/cards" },
  ];

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">نمای کلی باشگاه</h1>
        <p className="text-xs text-fc-muted">
          {faDigits(recentTaps.count ?? 0)} تردد در هفت روز گذشته
        </p>
      </header>

      <section className="fc-raised p-5">
        <small className="text-[12px] text-fc-muted">ارزش ماهانه‌ی اشتراک‌های فعال</small>
        <b className="fc-lat fc-num mt-1 block text-[26px] font-extrabold text-fc-cyan">
          {faToman(monthly)}
        </b>
        <p className="mt-2 text-[12px] leading-relaxed text-fc-muted">
          جمع قیمت پلن هر عضوی که الان اشتراک فعال دارد — نه پیش‌بینی درآمد.
        </p>
      </section>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="fc-card p-4 transition-colors hover:border-[var(--fc-line2)]"
          >
            <Icon className="mb-2 size-[18px] text-fc-cyan" />
            <b className="fc-lat fc-num block text-[22px] font-extrabold">
              {faNumber(value)}
            </b>
            <small className="text-[11.5px] text-fc-dim">{label}</small>
          </Link>
        ))}
      </div>

      <h2 className="mt-6 mb-3 text-[14.5px]">ورود و خروج با کارت</h2>
      <CheckinToggle initial={checkinOn} />

      <div className="h-6" />
    </>
  );
}
