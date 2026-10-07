import { BadgePercent, Info, TriangleAlert, type LucideIcon } from "lucide-react";

export const TONE: Record<"info" | "offer" | "alert", { icon: LucideIcon; color: string; label: string }> = {
  info: { icon: Info, color: "var(--color-fc-cyan)", label: "خبر" },
  offer: { icon: BadgePercent, color: "var(--color-fc-ok)", label: "تخفیف و پیشنهاد" },
  alert: { icon: TriangleAlert, color: "var(--color-fc-warn)", label: "مهم" },
};

/** An announcement as a member sees it on the home screen. */
export function AnnouncementCard({
  title,
  body,
  tone,
}: {
  title: string;
  body: string | null;
  tone: "info" | "offer" | "alert";
}) {
  const t = TONE[tone] ?? TONE.info;
  const Icon = t.icon;
  return (
    <article
      className="flex gap-3 rounded-[var(--radius-fc)] border p-3.5"
      style={{
        borderColor: `color-mix(in srgb, ${t.color} 38%, transparent)`,
        background: `color-mix(in srgb, ${t.color} 8%, transparent)`,
      }}
    >
      <span
        aria-hidden
        className="grid size-9 shrink-0 place-items-center rounded-xl"
        style={{ color: t.color, background: `color-mix(in srgb, ${t.color} 15%, transparent)` }}
      >
        <Icon className="size-[18px]" />
      </span>
      <div className="min-w-0">
        <h3 className="text-[13.5px]">{title}</h3>
        {body && <p className="mt-0.5 text-[12.5px] leading-6 whitespace-pre-line text-fc-muted">{body}</p>}
      </div>
    </article>
  );
}
