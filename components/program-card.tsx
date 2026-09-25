import Image from "next/image";
import { ArrowLeft, BarChart3, Flame, Timer } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { faDigits, faNumber } from "@/lib/format";
import { LEVEL_LABEL, type Level } from "@/lib/workout-estimate";

export interface ProgramCardProps {
  title: string;
  /** Dominant muscle group — the eyebrow above the title. */
  eyebrow: string;
  minutes: number;
  /** Null when the member has no weight on file; the tile is dropped. */
  kcal: number | null;
  level: Level;
  coachName: string | null;
  exerciseCount: number;
  /** Public URL of the cover, or null for the gradient fallback. */
  coverUrl: string | null;
  /** Rendered as a link when given a target, otherwise a plain panel. */
  href?: string;
  ctaLabel?: string;
  /** The first card on a page is the LCP element — let it preload. */
  priority?: boolean;
}

/** The programme, as the member meets it: a photo, the two numbers that
 *  decide whether they have time for it today, and who wrote it. */
export function ProgramCard({
  title,
  eyebrow,
  minutes,
  kcal,
  level,
  coachName,
  exerciseCount,
  coverUrl,
  href,
  ctaLabel = "شروع تمرین",
  priority = false,
}: ProgramCardProps) {
  const Root = href ? "a" : "div";

  return (
    <Root
      {...(href ? { href } : {})}
      className="group relative block aspect-[4/5] w-full overflow-hidden rounded-[24px] border border-[rgba(255,255,255,.12)] shadow-[0_26px_60px_-30px_rgba(0,0,0,.9)] sm:aspect-[16/11]"
    >
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
        />
      ) : (
        <CoverArt seed={eyebrow + title} />
      )}

      {/* Guarantees the contrast the gate measured, whatever the photo is */}
      <span className="fc-cover-scrim" />

      <div className="relative flex h-full flex-col p-5">
        <header>
          <span className="fc-eyebrow">{eyebrow}</span>
          <h2 className="mt-1.5 text-[clamp(22px,6vw,30px)] leading-[1.15] tracking-[-0.02em]">
            {title}
          </h2>
          <p className="mt-1.5 text-[12.5px] text-fc-muted">
            {faDigits(exerciseCount)} حرکت
            {coachName ? ` · نوشته‌ی ${coachName}` : ""}
          </p>
        </header>

        <div className="mt-auto grid gap-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <Stat icon={Timer} value={`${faDigits(minutes)} دقیقه`} label="زمان تقریبی" />
            {kcal !== null ? (
              <Stat icon={Flame} value={`${faNumber(kcal)} کالری`} label="سوخت تقریبی" />
            ) : (
              <Stat icon={BarChart3} value={LEVEL_LABEL[level]} label="سطح" />
            )}
          </div>

          {kcal !== null && (
            <div className="flex items-center gap-2 rounded-2xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.07)] px-3.5 py-2.5 backdrop-blur-md">
              <BarChart3 className="size-4 shrink-0 text-fc-cyan" />
              <span className="text-[12.5px] text-fc-muted">سطح</span>
              <b className="ms-auto text-[13px]">{LEVEL_LABEL[level]}</b>
            </div>
          )}

          {href && (
            <span className="fc-btn mt-1 w-full justify-between">
              {ctaLabel}
              <ArrowLeft className="size-[18px]" />
            </span>
          )}
        </div>
      </div>
    </Root>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Timer;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-[rgba(255,255,255,.12)] bg-[rgba(255,255,255,.07)] px-3.5 py-2.5 backdrop-blur-md">
      <Icon className="size-[18px] shrink-0 text-fc-cyan" />
      <span className="min-w-0">
        <b className="fc-num block truncate text-[13.5px]">{value}</b>
        <small className="block text-[10.5px] text-fc-muted">{label}</small>
      </span>
    </div>
  );
}
