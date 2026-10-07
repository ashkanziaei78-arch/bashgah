import { LOGO_BARS, LOGO_BODY, LOGO_HEAD, LOGO_HEAD_STOPS, LOGO_STOPS, LOGO_VIEWBOX } from "@/lib/brand-paths";

/** The Fit Club mark.
 *
 *  The runner is drawn in `currentColor`, so it is white on a dark theme
 *  and ink on a light one; in the artwork it is white, which would vanish
 *  on the light themes. The gaps around the runner and head are cut with
 *  a mask rather than painted, so they show whatever is behind the logo.
 *  Several logos on one page share these ids; the definitions are
 *  identical, so whichever one the browser resolves draws the same. */
export function LogoMark({ size = 40, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      viewBox={LOGO_VIEWBOX}
      width={size}
      height={size}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id="fcl-bar" x1="0" y1="1" x2="1" y2="0.15">
          {LOGO_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <linearGradient id="fcl-head" x1="0" y1="0" x2="1" y2="1">
          {LOGO_HEAD_STOPS.map(([o, c]) => <stop key={o} offset={o} stopColor={c} />)}
        </linearGradient>
        <mask id="fcl-gap" maskUnits="userSpaceOnUse" x="-20" y="-20" width="700" height="700">
          <rect x="-20" y="-20" width="700" height="700" fill="#fff" />
          <path d={LOGO_BODY} fill="#000" stroke="#000" strokeWidth="18" strokeLinejoin="round" />
          <circle cx={LOGO_HEAD.cx} cy={LOGO_HEAD.cy} r={LOGO_HEAD.r + 11} fill="#000" />
        </mask>
      </defs>
      <g mask="url(#fcl-gap)" fill="url(#fcl-bar)">
        {LOGO_BARS.map((d) => <path key={d.slice(0, 12)} d={d} />)}
      </g>
      <path d={LOGO_BODY} fill="currentColor" />
      <circle cx={LOGO_HEAD.cx} cy={LOGO_HEAD.cy} r={LOGO_HEAD.r} fill="url(#fcl-head)" />
    </svg>
  );
}

/** "FitClub" as in the artwork: heavy, slanted, "Club" in the brand
 *  green. Written left to right whatever the page direction. */
export function Wordmark({ size = 20, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      dir="ltr"
      className={`inline-block font-black tracking-[-0.02em] ${className}`}
      style={{ fontFamily: "var(--font-lat)", fontSize: size, lineHeight: 1, fontStyle: "italic" }}
    >
      <span className="text-fc-text">Fit</span>
      <span style={{ color: "#10c99a" }}>Club</span>
    </span>
  );
}

/** Mark and wordmark together: stacked for a sign-in screen, inline for
 *  a header. */
export function Logo({
  variant = "inline",
  size = 36,
  className = "",
}: {
  variant?: "inline" | "stack";
  size?: number;
  className?: string;
}) {
  if (variant === "stack") {
    return (
      <span className={`inline-flex flex-col items-center gap-3 text-fc-text ${className}`}>
        <LogoMark size={size} />
        <Wordmark size={Math.round(size * 0.42)} />
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-2 text-fc-text ${className}`} dir="ltr">
      <LogoMark size={size} />
      <Wordmark size={Math.round(size * 0.5)} />
    </span>
  );
}
