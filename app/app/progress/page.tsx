import { LineChart } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, one } from "@/lib/data";
import { ProgressView, type ExerciseSeries } from "@/components/progress-view";
import { EmptyState } from "@/components/ui";
import { faDateShort, sinceDaysAgo, weeklyCounts } from "@/lib/format";

export const metadata = { title: "پیشرفت" };

interface LogRow {
  performed_on: string;
  weight_kg: number | null;
  completed: boolean;
  program_items:
    | { exercises: { name: string } | { name: string }[] | null }
    | { exercises: { name: string } | { name: string }[] | null }[]
    | null;
}

const WEEKS = 8;

export default async function Progress() {
  const profile = await requireProfile();
  const supabase = await createClient();

  const [{ data: logs }, { data: checkins }] = await Promise.all([
    supabase
      .from("workout_logs")
      .select(
        "performed_on, weight_kg, completed, program_items(exercises(name))"
      )
      .eq("student_id", profile.id)
      .not("weight_kg", "is", null)
      .order("performed_on", { ascending: true }),
    supabase
      .from("checkins")
      .select("at")
      .eq("student_id", profile.id)
      .eq("kind", "in")
      .gte("at", sinceDaysAgo(WEEKS * 7)),
  ]);

  const rows = (logs ?? []) as unknown as LogRow[];

  // One series per exercise, in order of how much was logged — the lift
  // a member records most is the one they came to this screen for.
  const byExercise = new Map<string, { label: string; value: number }[]>();
  let volume = 0;
  let best: number | null = null;
  const sessionDays = new Set<string>();

  for (const row of rows) {
    const item = one<{ exercises: { name: string } | { name: string }[] | null }>(
      row.program_items
    );
    const name = one<{ name: string }>(item?.exercises ?? null)?.name;
    const kg = row.weight_kg;
    if (!name || kg === null) continue;

    sessionDays.add(row.performed_on);
    volume += kg;
    if (best === null || kg > best) best = kg;

    const list = byExercise.get(name) ?? [];
    list.push({ label: faDateShort(row.performed_on), value: kg });
    byExercise.set(name, list);
  }

  const series: ExerciseSeries[] = [...byExercise.entries()]
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points.length - a.points.length);

  // Eight buckets, oldest first, each one calendar week wide.
  const weeks = weeklyCounts(
    (checkins ?? []).map((c: { at: string }) => c.at),
    WEEKS
  );

  if (series.length === 0) {
    return (
      <>
        <header className="pt-6 pb-4">
          <h1 className="text-xl">پیشرفت</h1>
        </header>
        <EmptyState
          icon={LineChart}
          title="هنوز چیزی برای نشان‌دادن نیست"
          body="وزنه‌ی هر ست را که در تب تمرین ثبت کنی، از جلسه‌ی دوم به بعد خط پیشرفتت اینجا کشیده می‌شود."
        />
        <div className="h-8" />
      </>
    );
  }

  return (
    <>
      <header className="pt-6 pb-4">
        <h1 className="text-xl">پیشرفت</h1>
        <p className="text-xs text-fc-dim">
          از روی وزنه‌هایی که خودت ثبت کرده‌ای
        </p>
      </header>

      <ProgressView
        series={series}
        weeks={weeks}
        totals={{
          sessions: sessionDays.size,
          volumeKg: volume,
          bestLift: best,
        }}
      />

      <div className="h-8" />
    </>
  );
}
