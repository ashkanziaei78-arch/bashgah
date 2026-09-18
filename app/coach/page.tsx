import Link from "next/link";
import { ChevronLeft, Inbox, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStaff } from "@/lib/data";
import { RequestQueue, type QueueRow } from "@/components/coach/request-queue";
import { faDigits, faDateLong, daysUntil } from "@/lib/format";

export const metadata = { title: "پنل مربی" };

interface MemberRow {
  id: string;
  full_name: string;
  memberships: {
    expires_on: string;
    sessions_total: number | null;
    sessions_used: number;
    status: string;
  }[];
}

export default async function CoachHome() {
  const profile = await requireStaff();
  const supabase = await createClient();

  const [{ data: requests }, { data: members }] = await Promise.all([
    // Two foreign keys point at profiles (student_id and coach_id), so the
    // embed has to name which one it means.
    supabase
      .from("requests")
      .select(
        `id, kind, status, slot_at, message, created_at,
         student:profiles!requests_student_id_fkey(id, full_name)`
      )
      .in("status", ["pending", "scheduled"])
      .order("created_at", { ascending: true }),
    supabase
      .from("profiles")
      .select(
        `id, full_name,
         memberships(expires_on, sessions_total, sessions_used, status)`
      )
      .eq("role", "student")
      .order("full_name"),
  ]);

  const queue: QueueRow[] = (requests ?? []).map(
    (r: {
      id: string;
      kind: "workout" | "diet";
      status: "pending" | "scheduled";
      slot_at: string | null;
      message: string | null;
      student: { id: string; full_name: string } | { id: string; full_name: string }[] | null;
    }) => {
      const student = Array.isArray(r.student) ? r.student[0] : r.student;
      return {
        id: r.id,
        kind: r.kind,
        status: r.status,
        slotAt: r.slot_at,
        message: r.message,
        studentId: student?.id ?? "",
        studentName: student?.full_name ?? "بدون نام",
      };
    }
  );

  const pending = queue.filter((r) => r.status === "pending").length;
  const roster = (members ?? []) as MemberRow[];

  return (
    <>
      <header className="pt-5 pb-3.5">
        <h1 className="text-lg">سلام {profile.full_name.split(" ")[0]}</h1>
        <p className="text-xs text-fc-dim">{faDateLong(new Date())}</p>
      </header>

      <section className="fc-raised flex items-center gap-4 p-5">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[var(--fc-line2)] bg-fc-navy2/60 text-fc-cyan">
          <Inbox className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="block text-[14.5px]">
            {pending > 0
              ? `${faDigits(pending)} درخواست در انتظار تایم`
              : "درخواست بی‌پاسخی نمانده"}
          </b>
          <small className="text-[12.5px] text-fc-muted">
            {pending > 0
              ? "برای هر کدام یک جلسه‌ی حضوری بگذارید."
              : "هر درخواست تازه همین‌جا بالا می‌آید."}
          </small>
        </div>
      </section>

      <h2 className="mt-6 mb-3 text-[14.5px]">صف درخواست‌ها</h2>
      {queue.length > 0 ? (
        <RequestQueue rows={queue} />
      ) : (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          صف خالی است. وقتی شاگردی از اپ درخواست بدهد، اینجا می‌بینیدش.
        </p>
      )}

      <h2 className="mt-6 mb-3 flex items-center gap-2 text-[14.5px]">
        <Users className="size-4 text-fc-dim" />
        شاگردها
        <span className="fc-chip fc-num ms-auto">{faDigits(roster.length)}</span>
      </h2>

      {roster.length > 0 ? (
        <ul className="grid list-none gap-2.5 p-0">
          {roster.map((member) => {
            const active = member.memberships?.find((m) => m.status === "active");
            const left =
              active && active.sessions_total !== null
                ? Math.max(0, active.sessions_total - active.sessions_used)
                : null;

            return (
              <li key={member.id}>
                <Link
                  href={`/coach/${member.id}`}
                  className="fc-card flex items-center gap-3 p-3.5 transition-colors hover:border-[var(--fc-line2)]"
                >
                  <span
                    className="fc-lat grid size-11 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white"
                    style={{ background: "var(--fc-grad)" }}
                  >
                    {member.full_name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join(" ")}
                  </span>

                  <span className="min-w-0 flex-1">
                    <b className="block text-[13.5px]">{member.full_name}</b>
                    <small className="text-[11.5px] text-fc-dim">
                      {active
                        ? `${faDigits(daysUntil(active.expires_on))} روز مانده${
                            left !== null ? ` · ${faDigits(left)} جلسه` : " · نامحدود"
                          }`
                        : "بدون اشتراک فعال"}
                    </small>
                  </span>

                  {!active && <span className="fc-chip fc-chip-warn shrink-0">منقضی</span>}
                  <ChevronLeft className="size-[18px] shrink-0 text-fc-dim" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="fc-card p-4 text-[13px] text-fc-muted">
          هنوز شاگردی ثبت نشده. حساب‌ها را پذیرش باشگاه می‌سازد.
        </p>
      )}

      <div className="h-6" />
    </>
  );
}
