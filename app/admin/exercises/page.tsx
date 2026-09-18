import { createClient } from "@/lib/supabase/server";
import { ExerciseEditor, type ExerciseRow } from "@/components/admin/exercise-editor";

export const metadata = { title: "کتابخانه حرکات" };

export default async function AdminExercises() {
  const supabase = await createClient();

  const { data } = await supabase
    .from("exercises")
    .select("id, name, muscle_group, level, instructions, video_path, duration_seconds")
    .order("muscle_group")
    .order("name");

  const rows: ExerciseRow[] = (
    (data ?? []) as {
      id: string;
      name: string;
      muscle_group: string;
      level: "beginner" | "intermediate" | "advanced";
      instructions: string | null;
      video_path: string | null;
      duration_seconds: number | null;
    }[]
  ).map((row) => ({
    id: row.id,
    name: row.name,
    muscleGroup: row.muscle_group,
    level: row.level,
    instructions: row.instructions ?? "",
    videoPath: row.video_path ?? "",
    durationSeconds: row.duration_seconds,
  }));

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">کتابخانه حرکات</h1>
        <p className="text-xs text-fc-muted">
          هرچه اینجا باشد، مربی می‌تواند در برنامه‌ی شاگرد بگذارد.
        </p>
      </header>

      <ExerciseEditor rows={rows} />
      <div className="h-6" />
    </>
  );
}
