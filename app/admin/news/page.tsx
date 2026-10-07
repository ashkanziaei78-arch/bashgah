import { Pin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { AnnouncementCard } from "@/components/engage/tone";
import { AnnouncementForm, DeleteAnnouncement } from "@/components/engage/announcement-form";
import { faDate, todayInTehran } from "@/lib/format";

export const metadata = { title: "اطلاعیه‌ها" };

interface Row {
  id: string;
  title: string;
  body: string | null;
  tone: "info" | "offer" | "alert";
  pinned: boolean;
  publish_from: string;
  publish_until: string | null;
}

export default async function NewsPage() {
  const supabase = await createClient();
  const today = todayInTehran();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, tone, pinned, publish_from, publish_until")
    .order("publish_from", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as Row[];

  const state = (r: Row) =>
    r.publish_from > today ? "scheduled" : r.publish_until && r.publish_until < today ? "ended" : "live";

  return (
    <div className="grid gap-5 py-5 pb-12">
      <header>
        <h1 className="text-lg">اطلاعیه‌ها</h1>
        <p className="text-xs text-fc-muted">روی صفحه‌ی اول اپ همه‌ی اعضا، فقط در روزهایی که انتخاب می‌کنید.</p>
      </header>

      <AnnouncementForm />

      <section className="grid gap-3">
        {rows.length === 0 && <p className="fc-card p-5 text-center text-[13px] text-fc-muted">هنوز اطلاعیه‌ای منتشر نشده است.</p>}
        {rows.map((r) => {
          const s = state(r);
          return (
            <div key={r.id} className={`grid gap-2 ${s === "ended" ? "opacity-60" : ""}`}>
              <div className="flex items-center gap-2 text-[11.5px] text-fc-muted">
                <span className={`fc-chip ${s === "live" ? "fc-chip-ok" : s === "scheduled" ? "fc-chip-cy" : ""}`}>
                  {s === "live" ? "در حال نمایش" : s === "scheduled" ? "زمان‌بندی‌شده" : "تمام‌شده"}
                </span>
                {r.pinned && <Pin className="size-3.5" aria-label="ثابت" />}
                <span>
                  از {faDate(r.publish_from)}
                  {r.publish_until ? ` تا ${faDate(r.publish_until)}` : ""}
                </span>
                <span className="ms-auto"><DeleteAnnouncement id={r.id} /></span>
              </div>
              <AnnouncementCard title={r.title} body={r.body} tone={r.tone} />
            </div>
          );
        })}
      </section>
    </div>
  );
}
