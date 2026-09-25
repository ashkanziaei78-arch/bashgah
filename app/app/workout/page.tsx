import { createClient } from "@/lib/supabase/server";
import { requireProfile, one } from "@/lib/data";
import { ExerciseList, type ExerciseRow } from "@/components/exercise-list";
import { ProgramCard } from "@/components/program-card";
import { RequestButton } from "@/components/request-button";
import { todayInTehran } from "@/lib/format";
import { programCoverUrl } from "@/lib/storage";
import { estimateWorkout, type Level } from "@/lib/workout-estimate";

export const metadata = { title: "تمرین" };

interface ExerciseInfo {
  name: string;
  muscle_group: string;
  level: Level | null;
  duration_seconds: number | null;
  video_path: string | null;
  instructions: string | null;
}

/** The group most of the session is spent on — the card's eyebrow. */
function dominantGroup(groups: string[]): string {
  const tally = new Map<string, number>();
  for (const g of groups) tally.set(g, (tally.get(g) ?? 0) + 1);
  return [...tally.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "تمرین امروز";
}

interface ItemRow {
  id: string;
  position: number;
  sets: number;
  reps: number;
  rest_seconds: number;
  exercises: ExerciseInfo | ExerciseInfo[] | null;
}

export default async function Workout() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const today = todayInTehran();

  const { data: program } = await supabase
    .from("programs")
    .select(
      `id, title, notes, published_at, coach_id, cover_path,
       program_items(id, position, sets, reps, rest_seconds,
         exercises(name, muscle_group, level, duration_seconds, video_path, instructions))`
    )
    .eq("student_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return (
      <>
        <header className="pt-5 pb-4">
          <h1 className="text-lg">تمرین</h1>
        </header>
        <div className="fc-raised p-7 text-center">
          <h2 className="mb-2 text-base">هنوز برنامه‌ای ندارید</h2>
          <p className="mb-5 text-[13px] text-fc-muted">
            درخواست بدهید تا مربی یک تایم حضوری برایتان بگذارد و برنامه‌تان را
            بنویسد.
          </p>
          <RequestButton kind="workout" label="درخواست برنامه تمرینی" />
        </div>
      </>
    );
  }

  const items = ((program.program_items ?? []) as unknown as ItemRow[])
    .slice()
    .sort((a, b) => a.position - b.position);
  const itemIds = items.map((i) => i.id);

  const { data: logs } = await supabase
    .from("workout_logs")
    .select("program_item_id, performed_on, weight_kg, completed")
    .eq("student_id", profile.id)
    .in("program_item_id", itemIds.length ? itemIds : ["00000000-0000-0000-0000-000000000000"])
    .order("performed_on", { ascending: false });

  const todayLog = new Map<string, { weight: number | null; done: boolean }>();
  const previous = new Map<string, number>();

  for (const l of logs ?? []) {
    if (l.performed_on === today) {
      todayLog.set(l.program_item_id, { weight: l.weight_kg, done: l.completed });
    } else if (!previous.has(l.program_item_id) && l.weight_kg !== null) {
      // rows arrive newest first, so the first non-today hit is the last session
      previous.set(l.program_item_id, l.weight_kg);
    }
  }

  const rows: ExerciseRow[] = items.map((it) => {
    const ex = one<ExerciseInfo>(it.exercises);
    return {
      itemId: it.id,
      name: ex?.name ?? "حرکت",
      sets: it.sets,
      reps: it.reps,
      instructions: ex?.instructions ?? null,
      hasVideo: !!ex?.video_path,
      weight: todayLog.get(it.id)?.weight ?? null,
      done: todayLog.get(it.id)?.done ?? false,
      previous: previous.get(it.id) ?? null,
    };
  });

  // profiles is locked down by RLS, so the coach's name comes from the
  // two-column directory view instead of an embed.
  const { data: coach } = await supabase
    .from("coach_directory")
    .select("full_name")
    .eq("id", program.coach_id)
    .maybeSingle();
  const coachName = coach?.full_name as string | undefined;

  // Both figures come out of the programme the coach wrote and the
  // member's own bodyweight — see lib/workout-estimate.ts.
  const estimate = estimateWorkout(
    items.map((it) => {
      const ex = one<ExerciseInfo>(it.exercises);
      return {
        sets: it.sets,
        restSeconds: it.rest_seconds,
        durationSeconds: ex?.duration_seconds ?? null,
        level: ex?.level ?? null,
      };
    }),
    profile.weight_kg === null ? null : Number(profile.weight_kg)
  );

  return (
    <>
      <div className="pt-5 pb-4">
        <ProgramCard
          title={program.title}
          eyebrow={dominantGroup(
            items.map((it) => one<ExerciseInfo>(it.exercises)?.muscle_group ?? "").filter(Boolean)
          )}
          minutes={estimate.minutes}
          kcal={estimate.kcal}
          level={estimate.level}
          coachName={coachName ?? null}
          exerciseCount={items.length}
          coverUrl={programCoverUrl(program.cover_path)}
          priority
        />
      </div>

      <ExerciseList rows={rows} studentId={profile.id} today={today} />

      {program.notes && (
        <p className="fc-card mt-4 p-4 text-[13px] leading-relaxed text-fc-muted">
          <b className="text-fc-text">یادداشت مربی: </b>
          {program.notes}
        </p>
      )}

      <div className="mt-4">
        <RequestButton kind="workout" label="درخواست برنامه جدید" variant="ghost" />
      </div>
      <div className="h-6" />
    </>
  );
}
