import Link from "next/link";
import { Target, PhoneCall, Trophy, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Kpi } from "@/components/reports/kpi";
import { LeadForm, LeadCard, type LeadRow } from "@/components/engage/leads";
import { conversion, followUp, LEAD_STATUS, LEAD_STATUSES, sortLeads, type LeadStatus } from "@/lib/leads";
import { faDigits, todayInTehran } from "@/lib/format";

export const metadata = { title: "مراجعه‌کننده‌ها" };

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const filter = (LEAD_STATUSES as string[]).includes(String(sp.s)) ? (sp.s as LeadStatus) : "open";
  const supabase = await createClient();
  const today = todayInTehran();
  const { data } = await supabase
    .from("leads")
    .select("id, full_name, phone, source, interest, status, note, follow_up_on, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  const all = (data ?? []) as LeadRow[];

  const openLeads = all.filter((l) => l.status !== "won" && l.status !== "lost");
  const due = openLeads.filter((l) => {
    const f = followUp(l.follow_up_on, today);
    return f === "overdue" || f === "today";
  }).length;
  const conv = conversion(all);
  const shown = sortLeads(filter === "open" ? openLeads : all.filter((l) => l.status === filter), today);
  const count = (s: LeadStatus) => all.filter((l) => l.status === s).length;

  return (
    <div className="grid gap-5 py-5 pb-12">
      <header>
        <h1 className="text-lg">مراجعه‌کننده‌ها</h1>
        <p className="text-xs text-fc-muted">هر کس قیمت پرسید یا جلسه‌ی آزمایشی آمد، اینجا ثبت شود تا تماس بعدی فراموش نشود.</p>
      </header>

      <section className="grid grid-cols-3 gap-3">
        <Kpi icon={Inbox} label="در جریان" value={faDigits(openLeads.length)} />
        <Kpi icon={PhoneCall} label="تماس امروز" value={faDigits(due)} tone={due ? "warn" : "ok"} />
        <Kpi icon={Trophy} label="عضو شدند" value={conv.rate === null ? "—" : `${faDigits(conv.rate)}٪`} hint={conv.decided ? `${faDigits(conv.won)} از ${faDigits(conv.decided)}` : undefined} tone="ok" />
      </section>

      <nav aria-label="فیلتر" className="fc-scroll -mx-1 overflow-x-auto">
        <ul className="flex list-none gap-1.5 px-1 pb-1">
          {[{ key: "open", label: "در جریان", n: openLeads.length }, ...LEAD_STATUSES.map((s) => ({ key: s, label: LEAD_STATUS[s], n: count(s) }))].map((t) => (
            <li key={t.key}>
              <Link
                href={t.key === "open" ? "/admin/leads" : `/admin/leads?s=${t.key}`}
                aria-current={filter === t.key ? "page" : undefined}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 text-[12.5px] font-bold whitespace-nowrap ${
                  filter === t.key ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted"
                }`}
              >
                {t.label}
                <span className="fc-num text-[11px] opacity-80">{faDigits(t.n)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-3">
        {shown.length === 0 ? (
          <p className="fc-card grid justify-items-center gap-2 p-6 text-center text-[13px] text-fc-muted">
            <Target className="size-7 text-fc-dim" />
            موردی نیست.
          </p>
        ) : (
          shown.map((l) => <LeadCard key={l.id} lead={l} />)
        )}
      </div>

      <LeadForm />
    </div>
  );
}
