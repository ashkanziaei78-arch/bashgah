/** What a member's own logbook says about how they train. Import-free. */

export interface LogFact { performed_on: string; completed: boolean; muscle: string | null }

/** Completed exercises per muscle group over the last `days` days,
 *  largest first. Groups at 5% or less fold into «سایر» so the bars stay
 *  readable. */
export function muscleShare(logs: LogFact[], today: string, days = 30) {
  const since = new Date(Date.parse(`${today}T00:00:00Z`) - (days - 1) * 86_400_000).toISOString().slice(0, 10);
  const counts = new Map<string, number>();
  let total = 0;
  for (const l of logs) {
    if (!l.completed || l.performed_on < since || l.performed_on > today) continue;
    const key = l.muscle?.trim() || "سایر";
    counts.set(key, (counts.get(key) ?? 0) + 1);
    total += 1;
  }
  const rows = [...counts.entries()].map(([muscle, count]) => ({ muscle, count, share: total ? count / total : 0 }));
  const big = rows.filter((r) => r.share > 0.05 && r.muscle !== "سایر").sort((a, b) => b.count - a.count);
  const rest = rows.filter((r) => !big.includes(r));
  if (rest.length) {
    const count = rest.reduce((n, r) => n + r.count, 0);
    big.push({ muscle: "سایر", count, share: total ? count / total : 0 });
  }
  return { total, rows: big };
}

function satWeekStart(day: string): string {
  const d = new Date(Date.parse(`${day}T00:00:00Z`));
  const since = (d.getUTCDay() + 1) % 7; // Saturday = 0
  return new Date(d.getTime() - since * 86_400_000).toISOString().slice(0, 10);
}

/** Training days per Iranian week for the last `weeks` weeks (oldest
 *  first), and the run of consecutive weeks — ending this week or last —
 *  with at least one session. This week does not break a streak just
 *  because it is Saturday morning. */
export function weeklyConsistency(days: string[], today: string, weeks = 8) {
  const thisWeek = satWeekStart(today);
  const starts = Array.from({ length: weeks }, (_, i) =>
    new Date(Date.parse(`${thisWeek}T00:00:00Z`) - (weeks - 1 - i) * 7 * 86_400_000).toISOString().slice(0, 10)
  );
  const unique = new Set(days.filter((d) => d <= today));
  const perWeek = new Map(starts.map((s) => [s, 0]));
  for (const d of unique) {
    const w = satWeekStart(d);
    if (perWeek.has(w)) perWeek.set(w, perWeek.get(w)! + 1);
  }
  const series = starts.map((s) => ({ week: s, days: perWeek.get(s)! }));
  let streak = 0;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i].days > 0) streak += 1;
    else if (i === series.length - 1) continue; // current week not started yet
    else break;
  }
  return { series, streak };
}
