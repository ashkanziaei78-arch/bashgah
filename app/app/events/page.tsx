import { notFound } from "next/navigation";
import { Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, getGym } from "@/lib/data";
import { EventCard } from "@/components/events/event-card";
import type { ListedEvent } from "@/lib/events";
import { sinceDaysAgo } from "@/lib/format";

export const metadata = { title: "مسابقه و رویداد" };

export default async function EventsPage() {
  await requireProfile();
  const gym = await getGym();
  if (!gym?.events_enabled) notFound();
  const supabase = await createClient();
  const now = new Date();
  // Two months back, so last month's results are still a tap away.
  const { data } = await supabase.rpc("event_list", { p_from: sinceDaysAgo(60) });
  const all = (data ?? []) as ListedEvent[];
  const upcoming = all.filter((e) => Date.parse(e.ends_at ?? e.starts_at) >= now.getTime() && e.status !== "finished");
  const past = all.filter((e) => !upcoming.includes(e)).reverse();

  return (
    <>
      <header className="flex items-center gap-3 pt-5 pb-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-fc-warn/12 text-fc-warn">
          <Trophy className="size-5" />
        </span>
        <div className="flex-1">
          <h1 className="text-lg">مسابقه و رویداد</h1>
          <p className="text-xs text-fc-muted">مسابقه‌ها و برنامه‌های ویژه‌ی باشگاه</p>
        </div>
      </header>

      {upcoming.length === 0 ? (
        <div className="fc-card grid justify-items-center gap-2 p-8 text-center">
          <Trophy className="size-8 text-fc-dim" />
          <p className="text-[14px] font-bold">فعلاً رویدادی در برنامه نیست</p>
          <p className="text-[12.5px] text-fc-muted">مسابقه‌ی بعدی که اعلام شود، همین‌جا می‌آید.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {upcoming.map((e) => <EventCard key={e.id} e={e} nowIso={now.toISOString()} />)}
        </div>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mt-6 mb-3 text-[14.5px]">گذشته</h2>
          <div className="grid gap-3 pb-8">
            {past.map((e) => <EventCard key={e.id} e={e} nowIso={now.toISOString()} />)}
          </div>
        </>
      )}
    </>
  );
}
