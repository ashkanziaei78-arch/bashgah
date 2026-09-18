import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ProgramBuilder,
  type ExerciseOption,
  type DraftItem,
} from "@/components/coach/program-builder";

export const metadata = { title: "نوشتن برنامه تمرینی" };

interface Params {
  params: Promise<{ studentId: string }>;
}

export default async function ProgramPage({ params }: Params) {
  const { studentId } = await params;
  const supabase = await createClient();

  const [{ data: student }, { data: exercises }, { data: previous }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("id", studentId)
        .maybeSingle(),
      supabase
        .from("exercises")
        .select("id, name, muscle_group, level")
        .order("muscle_group")
        .order("name"),
      // Coaches iterate on last week rather than starting blank, so the
      // most recent programme is offered as the starting point.
      supabase
        .from("programs")
        .select(
          `title, notes, published_at,
           program_items(exercise_id, position, sets, reps, rest_seconds, note)`
        )
        .eq("student_id", studentId)
        .eq("status", "published")
        .order("published_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  if (!student) notFound();

  const items: DraftItem[] = (previous?.program_items ?? [])
    .slice()
    .sort((a: { position: number }, b: { position: number }) => a.position - b.position)
    .map(
      (
        item: {
          exercise_id: string;
          sets: number;
          reps: number;
          rest_seconds: number;
          note: string | null;
        },
        index: number
      ) => ({
        key: `prev-${index}`,
        exerciseId: item.exercise_id,
        sets: item.sets,
        reps: item.reps,
        rest: item.rest_seconds,
        note: item.note ?? "",
      })
    );

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3.5">
        <Link
          href={`/coach/${studentId}`}
          aria-label="بازگشت به پرونده"
          className="grid size-9 shrink-0 place-items-center rounded-lg text-fc-dim hover:text-fc-text"
        >
          <ChevronLeft className="size-5 rotate-180" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg">برنامه تمرینی</h1>
          <p className="truncate text-xs text-fc-dim">برای {student.full_name}</p>
        </div>
      </header>

      <ProgramBuilder
        studentId={studentId}
        exercises={(exercises ?? []) as ExerciseOption[]}
        initialTitle={previous?.title ?? ""}
        initialNotes={previous?.notes ?? ""}
        initialItems={items}
        carriedOver={items.length > 0}
      />
    </>
  );
}
