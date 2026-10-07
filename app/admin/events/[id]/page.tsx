import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Users, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { one } from "@/lib/data";
import { EventIcon } from "@/components/events/event-icon";
import { Leaderboard, type BoardRow } from "@/components/events/leaderboard";
import { StatusBar, ParticipantRow, AddParticipant } from "@/components/events/manage";
import { EVENT_KIND_LABEL, SCORE_LABEL, type EventKind, type EventStatus, type ScoreKind } from "@/lib/events";
import { tehranClock } from "@/lib/classes";
import { faDayParts, faDigits, faToman } from "@/lib/format";

export const metadata = { title: "رویداد" };

interface Reg {
  id: string;
  student_id: string;
  division: string | null;
  status: "registered" | "attended" | "cancelled";
  profiles: { full_name: string } | { full_name: string }[] | null;
}

export default async function AdminEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("events")
    .select("id, title, description, kind, is_competition, starts_at, ends_at, location, capacity, fee_toman, divisions, score_kind, lower_is_better, status")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();

  const [{ data: regs }, { data: results }, { data: students }, { data: board }] = await Promise.all([
    supabase
      .from("event_registrations")
      .select("id, student_id, division, status, profiles!event_registrations_student_id_fkey(full_name)")
      .eq("event_id", id)
      .neq("status", "cancelled")
      .order("created_at"),
    supabase.from("event_results").select("student_id, score, note").eq("event_id", id),
    supabase.from("profiles").select("id, full_name").eq("role", "student").order("full_name"),
    supabase.rpc("event_leaderboard", { p_event: id }),
  ]);

  const list = (regs ?? []) as Reg[];
  const scores = new Map(((results ?? []) as { student_id: string; score: number; note: string | null }[]).map((r) => [r.student_id, r]));
  const taken = new Set(list.map((r) => r.student_id));
  const p = faDayParts(e.starts_at);
  const scoreKind = e.score_kind as ScoreKind;

  return (
    <div className="grid gap-5 py-5 pb-12">
      <Link href="/admin/events" className="inline-flex w-fit items-center gap-1 text-[12.5px] text-fc-muted hover:text-fc-cyan">
        <ChevronRight className="size-4" />مسابقه و رویداد
      </Link>

      <header className="fc-raised grid gap-4 p-5">
        <div className="flex items-start gap-4">
          <EventIcon kind={e.kind as EventKind} size={56} />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl">{e.title}</h1>
            <p className="mt-1 text-[12.5px] text-fc-muted">
              {EVENT_KIND_LABEL[e.kind as EventKind]}، {p.weekday} {p.day} {p.month}، ساعت {faDigits(tehranClock(e.starts_at))}
              {e.location ? `، ${e.location}` : ""}
              {e.fee_toman ? `، ${faToman(e.fee_toman)}` : ""}
            </p>
            {e.is_competition && (
              <p className="mt-1 flex items-center gap-1 text-[12px] text-fc-warn">
                <Trophy className="size-3.5" />
                {SCORE_LABEL[scoreKind]}، {e.lower_is_better ? "کمتر بهتر" : "بیشتر بهتر"}
                {(e.divisions as string[]).length > 0 && `، رده‌ها: ${(e.divisions as string[]).join("، ")}`}
              </p>
            )}
          </div>
        </div>
        {e.description && <p className="text-[12.5px] leading-6 whitespace-pre-line text-fc-muted">{e.description}</p>}
        <StatusBar id={e.id} status={e.status as EventStatus} />
      </header>

      <section className="fc-card p-4">
        <h2 className="mb-1 flex items-center gap-2 text-[14px]">
          <Users className="size-4 text-fc-cyan" />
          شرکت‌کننده‌ها <span className="fc-num text-[12px] font-medium text-fc-muted">({faDigits(list.length)}{e.capacity ? ` از ${faDigits(e.capacity)}` : ""})</span>
        </h2>
        {list.length === 0 ? (
          <p className="py-3 text-[12.5px] text-fc-muted">هنوز کسی ثبت‌نام نکرده است.</p>
        ) : (
          <ul className="list-none divide-y divide-[var(--fc-line)]">
            {list.map((r) => {
              const s = scores.get(r.student_id);
              return (
                <ParticipantRow
                  key={r.id}
                  eventId={e.id}
                  registrationId={r.id}
                  studentId={r.student_id}
                  name={one(r.profiles)?.full_name ?? "عضو"}
                  division={r.division}
                  status={r.status}
                  competition={e.is_competition}
                  scoreKind={scoreKind}
                  score={s ? Number(s.score) : null}
                  note={s?.note ?? null}
                />
              );
            })}
          </ul>
        )}
        <div className="mt-3 border-t border-[var(--fc-line)] pt-3">
          <AddParticipant
            eventId={e.id}
            students={((students ?? []) as { id: string; full_name: string }[]).filter((s) => !taken.has(s.id))}
            divisions={e.divisions as string[]}
          />
        </div>
      </section>

      {e.is_competition && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-[14.5px]"><Trophy className="size-4 text-fc-warn" />جدول نتایج</h2>
          <Leaderboard rows={(board ?? []) as BoardRow[]} scoreKind={scoreKind} />
        </section>
      )}
    </div>
  );
}
