import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getGym } from "@/lib/data";
import { EventIcon } from "@/components/events/event-icon";
import { EventForm } from "@/components/events/event-form";
import { EVENT_KIND_LABEL, type EventKind, type EventStatus } from "@/lib/events";
import { tehranClock } from "@/lib/classes";
import { faDayParts, faDigits } from "@/lib/format";

export const metadata = { title: "مسابقه و رویداد" };

const STATUS: Record<EventStatus, [string, string]> = {
  draft: ["پیش‌نویس", ""],
  published: ["در جریان", "fc-chip-ok"],
  finished: ["برگزار شد", "fc-chip-cy"],
  cancelled: ["لغو شد", "fc-chip-bad"],
};

interface Row {
  id: string;
  title: string;
  kind: EventKind;
  is_competition: boolean;
  starts_at: string;
  status: EventStatus;
  capacity: number | null;
  event_registrations: { status: string }[];
}

export default async function AdminEvents() {
  const gym = await getGym();
  if (!gym?.events_enabled) notFound();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select("id, title, kind, is_competition, starts_at, status, capacity, event_registrations(status)")
    .order("starts_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];

  return (
    <div className="grid gap-5 py-5 pb-12">
      <header>
        <h1 className="flex items-center gap-2 text-lg"><Trophy className="size-5 text-fc-warn" />مسابقه و رویداد</h1>
        <p className="text-xs text-fc-muted">مسابقه‌ی کراسفیت، رکوردگیری، دویدن، دورهمی… اعضا از اپ ثبت‌نام می‌کنند.</p>
      </header>

      <ul className="grid list-none gap-2">
        {rows.length === 0 && <li className="fc-card p-5 text-center text-[13px] text-fc-muted">هنوز رویدادی ثبت نشده است.</li>}
        {rows.map((r) => {
          const p = faDayParts(r.starts_at);
          const n = r.event_registrations.filter((x) => x.status !== "cancelled").length;
          return (
            <li key={r.id}>
              <Link href={`/admin/events/${r.id}`} className="fc-card flex items-center gap-3 p-3.5 hover:border-fc-cyan/50">
                <EventIcon kind={r.kind} size={44} />
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[14px]">{r.title}</b>
                  <small className="text-[11.5px] text-fc-muted">
                    {EVENT_KIND_LABEL[r.kind]}، {p.weekday} {p.day} {p.month}، {faDigits(tehranClock(r.starts_at))}، {faDigits(n)}{r.capacity ? ` از ${faDigits(r.capacity)}` : ""} نفر
                  </small>
                </span>
                <span className={`fc-chip ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</span>
                <ChevronLeft className="size-4 text-fc-dim" />
              </Link>
            </li>
          );
        })}
      </ul>

      <EventForm />
    </div>
  );
}
