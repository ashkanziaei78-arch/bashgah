import { Bike, Dumbbell, Flag, Flame, Footprints, Medal, PartyPopper, Weight, type LucideIcon } from "lucide-react";
import type { EventKind } from "@/lib/events";

export const EVENT_STYLE: Record<EventKind, { icon: LucideIcon; color: string }> = {
  crossfit: { icon: Flame, color: "#ff6b6b" },
  weightlifting: { icon: Weight, color: "#f5b942" },
  powerlifting: { icon: Dumbbell, color: "#00b2e3" },
  bodybuilding: { icon: Medal, color: "#a99bff" },
  running: { icon: Footprints, color: "#2ed3a7" },
  cycling: { icon: Bike, color: "#7fd1ff" },
  social: { icon: PartyPopper, color: "#ff8ad8" },
  other: { icon: Flag, color: "#8faecb" },
};

export function EventIcon({ kind, size = 52 }: { kind: EventKind; size?: number }) {
  const { icon: Icon, color } = EVENT_STYLE[kind] ?? EVENT_STYLE.other;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        // Pulled toward the text colour so a pale hue still reads on a light theme.
        color: `color-mix(in srgb, ${color} 72%, var(--color-fc-text))`,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 32%, transparent), 0 10px 24px -14px ${color}`,
      }}
    >
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.2} />
    </span>
  );
}
