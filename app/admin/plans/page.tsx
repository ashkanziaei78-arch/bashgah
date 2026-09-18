import { createClient } from "@/lib/supabase/server";
import { PlanEditor, type PlanRow } from "@/components/admin/plan-editor";

export const metadata = { title: "پلن‌ها" };

export default async function AdminPlans() {
  const supabase = await createClient();

  const [{ data: plans }, { data: counts }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, name, kind, price_toman, duration_days, sessions_total, perks, is_active")
      .order("sort_order"),
    supabase.from("memberships").select("plan_id").eq("status", "active"),
  ]);

  // How many people are on each plan right now — the number that decides
  // whether retiring one is safe.
  const inUse = new Map<string, number>();
  for (const row of (counts ?? []) as { plan_id: string }[]) {
    inUse.set(row.plan_id, (inUse.get(row.plan_id) ?? 0) + 1);
  }

  const rows: PlanRow[] = (
    (plans ?? []) as {
      id: string;
      name: string;
      kind: "basic" | "pro" | "vip";
      price_toman: number;
      duration_days: number;
      sessions_total: number | null;
      perks: string[];
      is_active: boolean;
    }[]
  ).map((plan) => ({
    id: plan.id,
    name: plan.name,
    kind: plan.kind,
    priceToman: plan.price_toman,
    durationDays: plan.duration_days,
    sessionsTotal: plan.sessions_total,
    perks: plan.perks ?? [],
    isActive: plan.is_active,
    activeMembers: inUse.get(plan.id) ?? 0,
  }));

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">پلن‌ها</h1>
        <p className="text-xs text-fc-muted">
          هرچه اینجا فعال باشد، در صفحه‌ی اصلی سایت به مشتری نشان داده می‌شود.
        </p>
      </header>

      <PlanEditor rows={rows} />
      <div className="h-6" />
    </>
  );
}
