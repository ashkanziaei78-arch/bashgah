import { faDigits } from "@/lib/format";
import { seats } from "@/lib/classes";

/** Seats as a bar and a sentence. The sentence carries the meaning; the
 *  bar is there so a nearly-full class looks nearly full. */
export function SeatBar({
  booked,
  capacity,
  waitlisted,
}: {
  booked: number;
  capacity: number;
  waitlisted: number;
}) {
  const s = seats({ booked, capacity });
  const tone = s.full ? "var(--color-fc-bad)" : s.fill >= 0.75 ? "var(--color-fc-warn)" : "var(--color-fc-ok)";
  return (
    <div className="grid gap-1.5">
      <div className="fc-bar" aria-hidden>
        <i style={{ width: `${Math.round(s.fill * 100)}%`, background: tone }} />
      </div>
      <p className="flex items-center justify-between text-[11.5px] text-fc-muted">
        <span className="fc-num">
          {faDigits(booked)} از {faDigits(capacity)} نفر
        </span>
        <span style={{ color: tone }} className="font-bold">
          {s.full
            ? waitlisted > 0
              ? `پر، ${faDigits(waitlisted)} نفر در صف`
              : "پر"
            : `${faDigits(s.left)} جای خالی`}
        </span>
      </p>
    </div>
  );
}
