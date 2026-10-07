"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronLeft } from "lucide-react";
import { gymMediaUrl } from "@/lib/storage";
import { isExternal } from "@/lib/banners";

export interface Banner {
  id: string;
  title: string;
  body: string | null;
  image_path: string;
  link_url: string | null;
}

const ADVANCE_MS = 6000;

/** The club's news as a swipeable strip of photos.
 *
 *  Native scroll-snap does the swiping, so it feels like the phone's own
 *  carousel and needs no gesture code. It advances on its own every few
 *  seconds, but stops for good the moment the member touches it, and
 *  never moves for someone who asked the system for reduced motion. */
export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const track = useRef<HTMLDivElement>(null);
  const slides = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);
  const [touched, setTouched] = useState(false);

  // Which slide is mostly in view drives the dots.
  useEffect(() => {
    const root = track.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
        }
      },
      { root, threshold: 0.6 }
    );
    slides.current.forEach((s) => s && io.observe(s));
    return () => io.disconnect();
  }, [banners.length]);

  useEffect(() => {
    if (touched || banners.length < 2) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => go((active + 1) % banners.length), ADVANCE_MS);
    return () => window.clearTimeout(t);
  });

  function go(i: number) {
    const el = slides.current[i];
    const root = track.current;
    if (!el || !root) return;
    // scrollIntoView would also scroll the page; move only the strip.
    root.scrollTo({ left: el.offsetLeft - root.offsetLeft, behavior: "smooth" });
  }

  if (banners.length === 0) return null;

  return (
    <section aria-label="خبرهای باشگاه" aria-roledescription="carousel" className="mb-3.5">
      <div
        ref={track}
        onPointerDown={() => setTouched(true)}
        onWheel={() => setTouched(true)}
        className="fc-dark flex snap-x snap-mandatory gap-2.5 overflow-x-auto overscroll-x-contain rounded-[22px] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {banners.map((b, i) => {
          const url = gymMediaUrl(b.image_path);
          const inner = (
            <>
              {url && (
                <Image
                  src={url}
                  alt=""
                  fill
                  sizes="(max-width: 600px) 100vw, 560px"
                  priority={i === 0}
                  className="object-cover"
                />
              )}
              <span className="fc-cover-scrim" />
              <span className="relative flex h-full flex-col justify-end p-4.5">
                <b className="text-[17px] leading-snug">{b.title}</b>
                {b.body && <span className="mt-1 line-clamp-2 text-[12.5px] text-fc-muted">{b.body}</span>}
                {b.link_url && (
                  <span className="mt-2 flex items-center gap-1 text-[12px] font-bold text-fc-cyan">
                    بیشتر
                    <ChevronLeft className="size-3.5" />
                  </span>
                )}
              </span>
            </>
          );
          const cls =
            "relative block aspect-[16/8] w-full shrink-0 snap-center overflow-hidden rounded-[22px] border border-[rgb(var(--fc-edge-rgb)/0.12)]";
          return (
            <div
              key={b.id}
              ref={(el) => {
                slides.current[i] = el;
              }}
              data-index={i}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} از ${banners.length}`}
              className="w-full shrink-0 snap-center"
            >
              {b.link_url ? (
                isExternal(b.link_url) ? (
                  <a href={b.link_url} target="_blank" rel="noopener noreferrer" className={cls}>
                    {inner}
                  </a>
                ) : (
                  <Link href={b.link_url} className={cls}>
                    {inner}
                  </Link>
                )
              ) : (
                <div className={cls}>{inner}</div>
              )}
            </div>
          );
        })}
      </div>

      {banners.length > 1 && (
        <div className="mt-2 flex justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-label={`خبر ${i + 1}`}
              aria-current={i === active}
              onClick={() => {
                setTouched(true);
                go(i);
              }}
              className="grid h-6 place-items-center px-0.5"
            >
              <span
                className="block h-1.5 rounded-full transition-[width,background-color] duration-200 ease-[var(--ease-out)]"
                style={{
                  width: i === active ? 18 : 6,
                  background: i === active ? "var(--color-fc-cyan)" : "var(--fc-line2)",
                }}
              />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
