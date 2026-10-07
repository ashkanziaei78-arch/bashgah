import { Medal } from "lucide-react";
import { formatScore, type ScoreKind } from "@/lib/events";
import { faDigits } from "@/lib/format";

export interface BoardRow {
  place: number;
  student_id: string;
  name: string;
  division: string | null;
  score: number;
  note: string | null;
  is_me: boolean;
}

const MEDAL = ["#f5c542", "#c9d3dd", "#d9925a"];

/** Results per division, best first. The places come from the database
 *  (rank(), so a tie shares a place), the formatting from lib/events. */
export function Leaderboard({ rows, scoreKind }: { rows: BoardRow[]; scoreKind: ScoreKind }) {
  const divisions = [...new Set(rows.map((r) => r.division ?? ""))];
  if (rows.length === 0) return <p className="fc-card p-5 text-center text-[13px] text-fc-muted">هنوز نتیجه‌ای ثبت نشده است.</p>;
  return (
    <div className="grid gap-4">
      {divisions.map((d) => (
        <section key={d || "all"} className="fc-card p-4">
          {d && <h3 className="mb-2 text-[14px]">{d}</h3>}
          <ol className="grid list-none gap-1.5">
            {rows.filter((r) => (r.division ?? "") === d).map((r) => (
              <li
                key={r.student_id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${r.is_me ? "bg-fc-cyan/10 ring-1 ring-fc-cyan/40" : ""}`}
              >
                <span className="grid size-8 shrink-0 place-items-center">
                  {r.place <= 3 ? (
                    <Medal className="size-6" style={{ color: MEDAL[r.place - 1] }} aria-label={`نفر ${faDigits(r.place)}`} />
                  ) : (
                    <b className="fc-num text-[14px] text-fc-muted">{faDigits(r.place)}</b>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <b className="block truncate text-[13.5px]">{r.name}{r.is_me ? " (شما)" : ""}</b>
                  {r.note && <small className="text-[11px] text-fc-muted">{r.note}</small>}
                </span>
                <b className="fc-num shrink-0 text-[14px]">{faDigits(formatScore(scoreKind, Number(r.score)))}</b>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </div>
  );
}
