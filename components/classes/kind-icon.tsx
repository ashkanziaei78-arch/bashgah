import {
  Activity, DoorOpen, Dumbbell, Flame, PersonStanding, StretchHorizontal, Timer, Weight,
  type LucideIcon,
} from "lucide-react";
import type { ClassKind } from "@/lib/classes";

/** Each kind of class gets its own icon and accent, so a timetable reads
 *  at a glance — the spin hour is the yellow bike, not the fourth row.
 *  Accents are only ever icon colour and a faint tile behind it; text
 *  stays on the measured tokens. */
export const KIND_STYLE: Record<ClassKind, { icon: LucideIcon; color: string }> = {
  strength: { icon: Dumbbell, color: "#00b2e3" },
  hiit: { icon: Flame, color: "#ff8a4c" },
  functional: { icon: Activity, color: "#2ed3a7" },
  mobility: { icon: StretchHorizontal, color: "#a99bff" },
  wod: { icon: Timer, color: "#ff6b6b" },
  weightlifting: { icon: Weight, color: "#f5b942" },
  gymnastics: { icon: PersonStanding, color: "#7fd1ff" },
  open_gym: { icon: DoorOpen, color: "#8faecb" },
};

export function KindIcon({ kind, size = 48 }: { kind: ClassKind; size?: number }) {
  const { icon: Icon, color } = KIND_STYLE[kind] ?? KIND_STYLE.functional;
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-2xl"
      style={{
        width: size,
        height: size,
        color,
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 32%, transparent), 0 10px 24px -14px ${color}`,
      }}
    >
      <Icon style={{ width: size * 0.48, height: size * 0.48 }} strokeWidth={2.2} />
    </span>
  );
}
