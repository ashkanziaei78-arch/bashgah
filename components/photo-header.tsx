import Image from "next/image";
import { CoverArt } from "@/components/cover-art";

/** A page's title laid over its own photograph.
 *
 *  Shorter than the programme card because it carries no figures — the
 *  panels below it do that. The scrim is the same one the cards use, so
 *  the contrast the gate measured holds here too whatever photo lands.
 */
export function PhotoHeader({
  tag,
  title,
  meta,
  coverUrl,
  priority = false,
}: {
  /** What the page is about, when the title alone does not say it. */
  tag?: string | null;
  title: string;
  meta?: string | null;
  coverUrl: string | null;
  priority?: boolean;
}) {
  return (
    <div className="relative aspect-[16/8] w-full overflow-hidden rounded-[22px] border border-[rgba(255,255,255,.12)] shadow-[0_22px_50px_-30px_rgba(0,0,0,.9)] sm:aspect-[16/6]">
      {coverUrl ? (
        <Image
          src={coverUrl}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover"
        />
      ) : (
        <CoverArt seed={(tag ?? "") + title} />
      )}
      <span className="fc-cover-scrim" />

      <div className="relative flex h-full flex-col justify-end p-5">
        <h1 className="text-[clamp(20px,5.5vw,26px)] leading-tight tracking-[-0.02em]">
          {title}
        </h1>
        {(tag || meta) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-fc-muted">
            {tag && <span className="font-bold text-fc-cyan">{tag}</span>}
            {meta && <span>{meta}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
