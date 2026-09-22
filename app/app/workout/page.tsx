import { ClipboardList } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, one } from "@/lib/data";
import { ExerciseList, type ExerciseRow } from "@/components/exercise-list";
import { RequestButton } from "@/components/request-button";
import { EmptyState } from "@/components/ui";
import { faDate, todayInTehran } from "@/lib/format";

export const metadata = { title: "تمرین" };

interface ExerciseInfo {
  name: string;
  muscle_group: string;
  video_path: string | null;
  thumb_path: string | null;
  instructions: string | null;
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
      `id, title, notes, published_at, coach_id,
       program_items(id, position, sets, reps, rest_seconds,
         exercises(name, muscle_group, video_path, thumb_path, instructions))`
    )
    .eq("student_id", profile.id)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!program) {
    return (
      <>
        <header className="pt-6 pb-4">
          <h1 className="text-xl">تمرین</h1>
        </header>
        <EmptyState
          icon={ClipboardList}
          title="هنوز برنامه‌ای ندارید"
          body="درخواست بدهید تا مربی یک تایم حضوری برایتان بگذارد و برنامه‌تان را بنویسد."
        >
          <RequestButton kind="workout" label="درخواست برنامه تمرینی" />
        </EmptyState>
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

  // The bucket is public (see migration 0009), so a URL can be built
  // without a round trip per exercise — which on the gym floor, over the
  // worst signal in the building, is the difference between a sheet that
  // opens and one that spins.
  const publicUrl = (path: string | null) =>
    path ? supabase.storage.from("exercise-videos").getPublicUrl(path).data.publicUrl : null;

  const rows: ExerciseRow[] = items.map((it) => {
    const ex = one<ExerciseInfo>(it.exercises);
    return {
      itemId: it.id,
      name: ex?.name ?? "حرکت",
      sets: it.sets,
      reps: it.reps,
      instructions: ex?.instructions ?? null,
      videoUrl: publicUrl(ex?.video_path ?? null),
      posterUrl: publicUrl(ex?.thumb_path ?? null),
      rest: it.rest_seconds,
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

  return (
    <>
      <header className="flex items-start gap-3 pt-6 pb-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl">{program.title}</h1>
          <p className="text-xs text-fc-dim">
            {coachName ? `نوشته‌ی ${coachName}` : "برنامه‌ی شما"}
            {program.published_at ? ` · ${faDate(program.published_at)}` : ""}
          </p>
        </div>
      </header>

      <ExerciseList rows={rows} studentId={profile.id} today={today} />

      {program.notes && (
        <div className="fc-card mt-4 border-fc-cyan/25 p-4">
          <b className="fc-eyebrow fc-eyebrow-lat mb-1.5 block">Coach note</b>
          <p className="text-sm leading-relaxed text-fc-muted">{program.notes}</p>
        </div>
      )}

      <div className="mt-4">
        <RequestButton kind="workout" label="درخواست برنامه جدید" variant="ghost" />
      </div>
      <div className="h-8" />
    </>
  );
}
