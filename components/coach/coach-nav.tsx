"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users } from "lucide-react";

const TABS = [
  { href: "/coach", label: "شاگردها", icon: Users },
  { href: "/coach/classes", label: "کلاس‌ها", icon: CalendarDays },
] as const;

export function CoachNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="بخش‌های پنل مربی">
      <ul className="flex list-none gap-1.5 pb-2.5">
        {TABS.map(({ href, label, icon: Icon }) => {
          // /coach is the student list and also the prefix of every
          // student page, so it stays lit there but not under classes.
          const active = href === "/coach" ? !pathname.startsWith("/coach/classes") : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-9 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                  active ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan" : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
                }`}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
