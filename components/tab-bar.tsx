"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, Nfc } from "lucide-react";

const TABS = [
  { href: "/app", label: "خانه", icon: Home },
  { href: "/app/workout", label: "تمرین", icon: Dumbbell },
  { href: "/app/nutrition", label: "تغذیه", icon: Apple },
  { href: "/app/checkin", label: "ورود", icon: Nfc },
] as const;

export function TabBar({ showCheckin }: { showCheckin: boolean }) {
  const pathname = usePathname();
  const tabs = showCheckin ? TABS : TABS.filter((t) => t.href !== "/app/checkin");

  return (
    <nav
      aria-label="ناوبری اپ"
      className="sticky bottom-0 z-40 border-t border-[var(--fc-line)] bg-fc-ink2/95 backdrop-blur-xl"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 12px)" }}
    >
      <ul
        className="mx-auto grid max-w-[560px] list-none gap-0.5 px-2 pt-2"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          // /app must not light up for every nested route
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`grid min-h-12 justify-items-center gap-1 rounded-xl px-0.5 py-1.5 text-[11px] font-bold transition-colors ${
                  active ? "bg-fc-cyan/10 text-fc-cyan" : "text-fc-dim hover:text-fc-muted"
                }`}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
