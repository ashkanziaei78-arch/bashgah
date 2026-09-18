"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CreditCard, Dumbbell, LayoutGrid, Nfc, Users } from "lucide-react";

const TABS = [
  { href: "/admin", label: "نمای کلی", icon: LayoutGrid },
  { href: "/admin/members", label: "اعضا", icon: Users },
  { href: "/admin/plans", label: "پلن‌ها", icon: CreditCard },
  { href: "/admin/exercises", label: "حرکات", icon: Dumbbell },
  { href: "/admin/cards", label: "کارت‌ها", icon: Nfc },
] as const;

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="بخش‌های مدیریت" className="fc-scroll -mx-1 overflow-x-auto">
      <ul className="flex list-none gap-1.5 px-1 pb-2.5">
        {TABS.map(({ href, label, icon: Icon }) => {
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
