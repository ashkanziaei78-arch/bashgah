import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Clock, MapPin, UserRound, Hourglass, Ban } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff, one } from "@/lib/data";
import { KindIcon } from "@/components/classes/kind-icon";
import { SeatBar } from "@/components/classes/seat-bar";
import { RosterRow, AddMember, CapacityEditor, CancelClass } from "@/components/classes/roster";
import { endsAt, KIND_LABEL, tehranClock, tehranDay, type BookingStatus, type ClassKind } from "@/lib/classes";
import { faDayParts, faDigits } from "@/lib/format";

export const metadata = { title: "کلاس" };

interface Booking {
  id: string;
  student_id: string;
  status: BookingStatus;
  queued_at: string;
  profiles: { full_name: string } | { full_name: string }[] | null;
}

export default async function ClassDetail({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const supabase = await createClient();

  const { data: s } = await supabase
    .from("class_sessions")
    .select("id, series_id, title, description, kind, starts_at, duration_min, capacity, location, cancelled_at, coach:profiles!class_sessions_coach_id_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!s) notFound();

  const [{ data: rows }, { data: students }] = await Promise.all([
    supabase
      .from("class_bookings")
      .select("id, student_id, status, queued_at, profiles!class_bookings_student_id_fkey(full_name)")
      .eq("session_id", id)
      .order("queued_at"),
    supabase.from("profiles").select("id, full_name").eq("role", "student").order("full_name"),
  ]);

  const bookings = (rows ?? []) as Booking[];
  const nameOf = (b: Booking) => one(b.profiles)?.full_name ?? "عضو";
  const seated = bookings.filter((b) => ["booked", "attended", "no_show"].includes(b.status));
  const queue = bookings.filter((b) => b.status === "waitlisted");
  const cancelled = bookings.filter((b) => b.status === "cancelled").length;

  // Who in the queue could not be seated even if a place opened: the
  // promotion skips them, so the desk should know why they are stuck.
  const queueIds = queue.map((b) => b.student_id);
  const day = tehranDay(s.starts_at);
  const { data: valid } = queueIds.length
    ? await supabase
        .from("memberships")
        .select("student_id, sessions_total, sessions_used")
        .in("student_id", queueIds)
        .eq("status", "active")
        .lte("started_on", day)
        .gte("expires_on", day)
    : { data: [] as { student_id: string; sessions_total: number | null; sessions_used: number }[] };
  const eligible = new Set(
    (valid ?? [])
      .filter((m) => m.sessions_total === null || m.sessions_used < m.sessions_total)
      .map((m) => m.student_id)
  );

  const startMs = Date.parse(s.starts_at);
  const nowMs = new Date().getTime();
  const canMark = startMs - nowMs <= 30 * 60_000 && !s.cancelled_at;
  const p = faDayParts(s.starts_at);
  const coach = one(s.coach as { full_name: string } | { full_name: string }[] | null);
  const inSeries = Boolean(s.series_id);
  const taken = new Set(bookings.filter((b) => b.status !== "cancelled").map((b) => b.student_id));

  return (
    <div className="grid gap-5 py-5">
      <Link href="/coach/classes" className="inline-flex w-fit items-center gap-1 text-[12.5px] text-fc-muted hover:text-fc-cyan">
        <ChevronRight className="size-4" />
        برنامه‌ی کلاس‌ها
      </Link>

      <header className="fc-raised flex items-start gap-4 p-5">
        <KindIcon kind={s.kind as ClassKind} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-xl">
            {s.title}
            {s.cancelled_at && <span className="fc-chip fc-chip-bad"><Ban className="size-3.5" />لغو شده</span>}
          </h1>
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[12.5px] text-fc-muted">
            <span>{p.weekday} {p.day} {p.month}</span>
            <span className="fc-num inline-flex items-center gap-1">
              <Clock className="size-3.5" />
              {faDigits(tehranClock(s.starts_at))} تا {faDigits(tehranClock(endsAt(s)))}
            </span>
            <span>{KIND_LABEL[s.kind as ClassKind]}</span>
            {coach && <span className="inline-flex items-center gap-1"><UserRound className="size-3.5" />{coach.full_name}</span>}
            {s.location && <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" />{s.location}</span>}
          </p>
          {!s.cancelled_at && (
            <div className="mt-3.5">
              <SeatBar booked={seated.length} capacity={s.capacity} waitlisted={queue.length} />
            </div>
          )}
        </div>
      </header>

      <section className="fc-card p-4">
        <h2 className="mb-1 text-[14px]">
          رزروها <span className="fc-num text-[12px] font-medium text-fc-muted">({faDigits(seated.length)})</span>
        </h2>
        {!canMark && seated.length > 0 && (
          <p className="mb-1 text-[11.5px] text-fc-muted">حضور و غیاب از نیم ساعت مانده به شروع باز می‌شود.</p>
        )}
        {seated.length === 0 ? (
          <p className="py-3 text-[12.5px] text-fc-muted">هنوز کسی رزرو نکرده است.</p>
        ) : (
          <ul className="list-none divide-y divide-[var(--fc-line)]">
            {seated.map((b) => (
              <RosterRow key={b.id} sessionId={s.id} bookingId={b.id} studentId={b.student_id} name={nameOf(b)} status={b.status} canMark={canMark} />
            ))}
          </ul>
        )}
      </section>

      {queue.length > 0 && (
        <section className="fc-card p-4">
          <h2 className="mb-1 flex items-center gap-2 text-[14px]">
            <Hourglass className="size-4 text-fc-warn" />
            صف انتظار <span className="fc-num text-[12px] font-medium text-fc-muted">({faDigits(queue.length)})</span>
          </h2>
          <ol className="list-none divide-y divide-[var(--fc-line)]">
            {queue.map((b, i) => (
              <RosterRow
                key={b.id}
                sessionId={s.id}
                bookingId={b.id}
                studentId={b.student_id}
                name={nameOf(b)}
                position={i + 1}
                status={b.status}
                canMark={false}
                note={eligible.has(b.student_id) ? undefined : "اشتراک معتبر ندارد؛ جا به او نمی‌رسد"}
              />
            ))}
          </ol>
        </section>
      )}

      {cancelled > 0 && (
        <p className="text-[12px] text-fc-muted">{faDigits(cancelled)} نفر رزروشان را لغو کرده‌اند.</p>
      )}

      {!s.cancelled_at && startMs > nowMs && (
        <>
          <section className="fc-card grid gap-3 p-4">
            <h2 className="text-[14px]">افزودن دستی</h2>
            <AddMember sessionId={s.id} students={((students ?? []) as { id: string; full_name: string }[]).filter((x) => !taken.has(x.id))} />
          </section>
          <section className="fc-card grid gap-3 p-4">
            <h2 className="text-[14px]">ظرفیت</h2>
            <CapacityEditor sessionId={s.id} capacity={s.capacity} inSeries={inSeries} />
          </section>
          <CancelClass sessionId={s.id} inSeries={inSeries} booked={seated.length} />
        </>
      )}
    </div>
  );
}
