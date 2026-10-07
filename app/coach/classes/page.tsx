import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, getGym } from "@/lib/data";
import { notFound } from "next/navigation";
import { KindIcon } from "@/components/classes/kind-icon";
import { SeatBar } from "@/components/classes/seat-bar";
import { ClassForm } from "@/components/classes/class-form";
import { groupByDay, tehranClock, tehranDay, tehranWeek, KIND_LABEL, KINDS_FOR, type ScheduledClass } from "@/lib/classes";
import { faDayParts, faDigits } from "@/lib/format";

export const metadata = { title: "برنامه‌ی کلاس‌ها" };

export default async function StaffClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  await requireStaff();
  const gym = await getGym();
  if (!gym?.classes_enabled) notFound();
  const sp = await searchParams;
  const offset = Math.max(-4, Math.min(8, Number(sp.w ?? 0) || 0));
  const now = new Date();
  const week = tehranWeek(now, offset);
  const supabase = await createClient();

  const [{ data }, { data: coaches }] = await Promise.all([
    supabase.rpc("class_schedule", { p_from: week.from, p_to: week.to }),
    supabase.from("profiles").select("id, full_name").in("role", ["coach", "admin"]).order("full_name"),
  ]);

  const classes = (data ?? []) as ScheduledClass[];
  const byDay = groupByDay(classes);
  const live = classes.filter((c) => !c.cancelled_at);
  const seats = live.reduce((n, c) => n + c.capacity, 0);
  const booked = live.reduce((n, c) => n + Math.min(c.booked, c.capacity), 0);
  const today = tehranDay(now);
  const first = faDayParts(week.days[0]);
  const last = faDayParts(week.days[6]);

  return (
    <div className="grid gap-5 py-5">
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-fc-cyan/12 text-fc-cyan">
          <CalendarDays className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg">برنامه‌ی کلاس‌ها</h1>
          <p className="text-xs text-fc-muted">
            {first.day} {first.month} تا {last.day} {last.month}
            {live.length > 0 && `، ${faDigits(live.length)} کلاس، ${faDigits(seats ? Math.round((booked / seats) * 100) : 0)}٪ پر`}
          </p>
        </div>
        <div className="flex gap-1.5">
          <Link href={`/coach/classes?w=${offset - 1}`} aria-label="هفته‌ی قبل" className="fc-btn fc-btn-ghost min-h-10 px-3">
            <ChevronRight className="size-4" />
          </Link>
          <Link href="/coach/classes" className="fc-btn fc-btn-ghost min-h-10 px-3 text-[12.5px]">این هفته</Link>
          <Link href={`/coach/classes?w=${offset + 1}`} aria-label="هفته‌ی بعد" className="fc-btn fc-btn-ghost min-h-10 px-3">
            <ChevronLeft className="size-4" />
          </Link>
        </div>
      </header>

      {classes.length === 0 ? (
        <p className="fc-card p-6 text-center text-[13px] text-fc-muted">این هفته کلاسی ثبت نشده است.</p>
      ) : (
        <div className="grid gap-4">
          {[...byDay.entries()].map(([day, list]) => {
            const p = faDayParts(day);
            return (
              <section key={day}>
                <h2 className="mb-2 text-[13.5px]">
                  {day === today ? "امروز" : p.weekday}{" "}
                  <span className="text-[12px] font-medium text-fc-muted">{p.day} {p.month}</span>
                </h2>
                <ul className="grid list-none gap-2">
                  {list.map((c) => (
                    <li key={c.id}>
                      <Link href={`/coach/classes/${c.id}`} className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-fc-cyan/50">
                        <KindIcon kind={c.kind} size={42} />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2 text-[14px] font-bold">
                            {c.title}
                            {c.cancelled_at && <span className="fc-chip fc-chip-bad"><Ban className="size-3" />لغو</span>}
                          </p>
                          <p className="mb-1.5 flex items-center gap-2 text-[11.5px] text-fc-muted">
                            <Clock className="size-3.5" />
                            <span className="fc-num">{faDigits(tehranClock(c.starts_at))}</span>
                            <span>{KIND_LABEL[c.kind]}</span>
                            {c.coach_name && <span>{c.coach_name}</span>}
                          </p>
                          {!c.cancelled_at && <SeatBar booked={c.booked} capacity={c.capacity} waitlisted={c.waitlisted} />}
                        </div>
                        <ChevronLeft className="size-4 shrink-0 text-fc-dim" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      <ClassForm coaches={(coaches ?? []) as { id: string; full_name: string }[]} kinds={KINDS_FOR[gym.kind]} />
    </div>
  );
}
