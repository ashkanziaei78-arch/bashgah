"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** Releases its children into view as the section scrolls up.
 *
 *  Sections below the fold cannot use the load-time entrance the app
 *  screens use — by the time they are seen the animation has long
 *  finished, so they would simply appear.
 *
 *  The hidden state is added here in an effect rather than in the
 *  server-rendered markup. That way a visitor whose JavaScript never
 *  runs, or whose browser has no IntersectionObserver, sees the page
 *  fully rendered instead of a column of invisible sections. */
export function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (
      typeof IntersectionObserver === "undefined" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    el.classList.add("fc-reveal");

    // Everything below is a safety net around the one real hazard of a
    // scroll reveal: the content starts invisible, so anything that stops
    // the observer firing strands it. Printing, an in-page anchor jump,
    // a full-page screenshot and a backgrounded tab have all been seen to
    // do exactly that.
    const show = () => el.classList.add("is-in");

    // Nothing may stay hidden longer than this, observer or not. Set
    // well clear of how long a real scroll takes to reach the section,
    // so it never pre-empts the effect — this is a stranding guard, not
    // a timing mechanism.
    const failsafe = setTimeout(show, 6000);
    window.addEventListener("beforeprint", show);

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          // One-shot: a section that re-hides on scroll-up reads as a
          // glitch rather than an effect.
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
    );

    io.observe(el);
    return () => {
      clearTimeout(failsafe);
      window.removeEventListener("beforeprint", show);
      io.disconnect();
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
