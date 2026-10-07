import Link from "next/link";
import { ChevronLeft, Dumbbell, Flame, Users, UserCog, Wallet, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Kpi } from "@/components/reports/kpi";
import { shortToman } from "@/components/reports/revenue-chart";
import { NewGymForm } from "@/components/platform/forms";
import { faDigits } from "@/lib/format";

interface GymRow {
  id: string;
  name: string;
  slug: string;
  kind: "bodybuilding" | "crossfit";
  classes_enabled: boolean;
  events_enabled: boolean;
  is_active: boolean;
  members: number;
  staff: number;
  active_memberships: number;
  revenue_30d: number;
}

export default async function PlatformHome() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("platform_gyms");
  const gyms = (data ?? []) as GymRow[];
  const sum = (k: keyof GymRow) => gyms.reduce((n, g) => n + Number(g[k] ?? 0), 0);

  return (
    <div className="grid gap-5 py-5 pb-12">
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Building2} label="باشگاه‌ها" value={faDigits(gyms.length)} />
        <Kpi icon={Users} label="اعضا" value={faDigits(sum("members"))} tone="ok" />
        <Kpi icon={UserCog} label="اشتراک فعال" value={faDigits(sum("active_memberships"))} tone="ok" />
        <Kpi icon={Wallet} label="دریافتی ۳۰ روز" value={shortToman(sum("revenue_30d"))} hint="همه‌ی باشگاه‌ها" />
      </section>

      <ul className="grid list-none gap-2">
        {gyms.map((g) => (
          <li key={g.id}>
            <Link href={`/platform/${g.id}`} className={`fc-card flex items-center gap-3 p-4 hover:border-fc-cyan/50 ${g.is_active ? "" : "opacity-60"}`}>
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-fc-cyan/12 text-fc-cyan">
                {g.kind === "crossfit" ? <Flame className="size-5" /> : <Dumbbell className="size-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <b className="block text-[14.5px]">{g.name}</b>
                <small className="text-[11.5px] text-fc-muted">
                  {g.kind === "crossfit" ? "کراسفیت" : "بدنسازی"}، {faDigits(g.members)} عضو، {faDigits(g.staff)} کادر، {faDigits(g.active_memberships)} اشتراک فعال
                </small>
                <span className="mt-1.5 flex flex-wrap gap-1.5">
                  {g.classes_enabled && <span className="fc-chip fc-chip-cy">کلاس</span>}
                  {g.events_enabled && <span className="fc-chip fc-chip-warn">مسابقه</span>}
                  {!g.is_active && <span className="fc-chip fc-chip-bad">غیرفعال</span>}
                </span>
              </span>
              <span className="fc-num text-[12.5px] text-fc-muted">{shortToman(g.revenue_30d)}</span>
              <ChevronLeft className="size-4 text-fc-dim" />
            </Link>
          </li>
        ))}
      </ul>

      <NewGymForm />
    </div>
  );
}
