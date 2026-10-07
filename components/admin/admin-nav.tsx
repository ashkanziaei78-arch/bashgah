"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, ChartColumn, CreditCard, Dumbbell, LayoutGrid, Megaphone, Nfc, Palette, Target, Trophy, Users, Wallet } from "lucide-react";

const TABS = [
  { href: "/admin", label: "نمای کلی", icon: LayoutGrid },
  { href: "/admin/money", label: "صندوق", icon: Wallet },
  { href: "/admin/reports", label: "گزارش‌ها", icon: ChartColumn },
  { href: "/admin/members", label: "اعضا", icon: Users },
  { href: "/coach/classes", label: "کلاس‌ها", icon: CalendarDays },
  { href: "/admin/events", label: "مسابقه و رویداد", icon: Trophy },
  { href: "/admin/leads", label: "مراجعه‌کننده‌ها", icon: Target },
  { href: "/admin/news", label: "اطلاعیه‌ها", icon: Megaphone },
  { href: "/admin/plans", label: "پلن‌ها", icon: CreditCard },
  { href: "/admin/exercises", label: "حرکات", icon: Dumbbell },
  { href: "/admin/cards", label: "کارت‌ها", icon: Nfc },
  { href: "/admin/appearance", label: "ظاهر", icon: Palette },
] as const;

export function AdminNav({ showClasses, showEvents }: { showClasses: boolean; showEvents: boolean }) {
  const pathname = usePathname();
  const tabs = TABS.filter(
    (t) => (showClasses || t.href !== "/coach/classes") && (showEvents || t.href !== "/admin/events")
  );

  return (
    <nav aria-label="بخش‌های مدیریت" className="fc-scroll -mx-1 overflow-x-auto">
      <ul className="flex list-none gap-1.5 px-1 pb-2.5">
        {tabs.map(({ href, label, icon: Icon }) => {
          // /admin is the overview, not a prefix for everything below it
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                  active
                    ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan"
                    : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
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
