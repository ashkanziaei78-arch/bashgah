/** The cover a programme gets before anyone uploads a photo.
 *
 *  Not a placeholder: a grey box with a broken-image glyph tells the
 *  member the app is unfinished. This is drawn art, and it is derived
 *  from the programme itself so that two programmes without photos are
 *  visibly two different cards — a chest day and a leg day should not
 *  look like the same empty rectangle.
 *
 *  Everything is seeded from a hash of the muscle group, which means an
 *  admin can invent a group name the code has never seen and it still
 *  gets a stable treatment of its own, the same one on every device and
 *  every render.
 */

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function CoverArt({ seed }: { seed: string }) {
  const h = hash(seed || "fitclub");

  // Kept inside 165°–232°: the brand runs cyan to navy, and a cover that
  // wanders into green or violet stops looking like this gym.
  const hue = 165 + (h % 68);
  const angle = 96 + ((h >> 5) % 62);

  // A plate stack / bar cluster. Heights come out of the hash so the
  // silhouette differs per programme, but stays a plausible rack shape.
  const bars = [0, 1, 2, 3, 4, 5].map((i) => 26 + (((h >> (i * 3)) % 9) * 8));

  return (
    <span className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <span
        className="absolute inset-0"
        style={{
          // Pitched bright deliberately: the scrim above drops the middle
          // of the card to 42% ink, and at lower alphas than these the
          // per-programme hue stops being visible at all through it.
          background: `
            radial-gradient(120% 95% at 84% 6%, hsl(${hue} 100% 52% / 0.62), transparent 60%),
            radial-gradient(110% 85% at 10% 98%, hsl(${hue + 20} 78% 42% / 0.62), transparent 64%),
            linear-gradient(155deg, #12417c, #04101f 76%)`,
        }}
      />

      <svg
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <linearGradient id={`fade-${h % 10000}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* concentric arcs — the sweep of a loaded bar */}
        {[74, 104, 134].map((r, i) => (
          <circle
            key={r}
            cx="330"
            cy="150"
            r={r}
            fill="none"
            stroke="#fff"
            strokeOpacity={0.16 - i * 0.04}
            strokeWidth="1.25"
          />
        ))}

        {/* the stack */}
        <g transform="translate(44 150)">
          {bars.map((height, i) => (
            <rect
              key={i}
              x={i * 25}
              y={-height / 2}
              width="11"
              height={height}
              rx="5.5"
              fill={`url(#fade-${h % 10000})`}
            />
          ))}
        </g>

      </svg>

      {/* Ruling, angled per programme. A CSS pattern rather than thirty
          <line> elements. */}

      <span
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage: `repeating-linear-gradient(${angle}deg, rgba(255,255,255,.055) 0 1px, transparent 1px 14px)`,
        }}
      />
    </span>
  );
}
