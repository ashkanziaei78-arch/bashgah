import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { EventIcon } from "@/components/events/event-icon";
import { Leaderboard, type BoardRow } from "@/components/events/leaderboard";
import { EVENT_KIND_LABEL, SCORE_LABEL, type EventKind, type ScoreKind } from "@/lib/events";
import { faDayParts } from "@/lib/format";

export const metadata = { title: "نتایج" };

export default async function EventResults({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const { id } = await params;
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("events")
    .select("id, title, kind, starts_at, score_kind, lower_is_better, status")
    .eq("id", id)
    .maybeSingle();
  if (!e) notFound();
  const { data } = await supabase.rpc("event_leaderboard", { p_event: id });
  const p = faDayParts(e.starts_at);

  return (
    <>
      <Link href="/app/events" className="mt-5 inline-flex w-fit items-center gap-1 text-[12.5px] text-fc-muted hover:text-fc-cyan">
        <ChevronRight className="size-4" />
        مسابقه و رویداد
      </Link>
      <header className="fc-raised mt-3 mb-4 flex items-center gap-4 p-5">
        <EventIcon kind={e.kind as EventKind} size={56} />
        <div className="min-w-0">
          <h1 className="text-lg">{e.title}</h1>
          <p className="text-[12px] text-fc-muted">
            {EVENT_KIND_LABEL[e.kind as EventKind]}، {p.weekday} {p.day} {p.month}
          </p>
          <p className="mt-1 flex items-center gap-1 text-[12px] text-fc-warn">
            <Trophy className="size-3.5" />
            {SCORE_LABEL[e.score_kind as ScoreKind]}، {e.lower_is_better ? "کمتر بهتر است" : "بیشتر بهتر است"}
          </p>
        </div>
      </header>
      <div className="pb-8">
        <Leaderboard rows={(data ?? []) as BoardRow[]} scoreKind={e.score_kind as ScoreKind} />
      </div>
    </>
  );
}
