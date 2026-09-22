"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, Nfc, Users } from "lucide-react";
import type { UserRole } from "@/lib/supabase/types";

const HOME = { href: "/app", label: "خانه", icon: Home };
const WORKOUT = { href: "/app/workout", label: "تمرین", icon: Dumbbell };
const NUTRITION = { href: "/app/nutrition", label: "تغذیه", icon: Apple };
const CHECKIN = { href: "/app/checkin", label: "ورود", icon: Nfc };
const USERS = { href: "/app/users", label: "کاربران", icon: Users };

export function TabBar({
  role,
  showCheckin,
}: {
  role: UserRole;
  showCheckin: boolean;
}) {
  const pathname = usePathname();

  // Five is the practical ceiling for a bottom bar; past that the labels
  // stop being readable on a small phone.
  const tabs = [
    HOME,
    WORKOUT,
    NUTRITION,
    ...(role === "student" && showCheckin ? [CHECKIN] : []),
    ...(role === "admin" ? [USERS] : []),
  ];

  return (
    <nav aria-label="ناوبری اپ" className="fc-tabbar">
      <ul
        className="mx-auto grid max-w-[560px] list-none gap-1 px-2.5 pt-1.5"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
      >
        {tabs.map(({ href, label, icon: Icon }) => {
          // /app must not light up for every nested route
          const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link href={href} aria-current={active ? "page" : undefined} className="fc-tab">
                <Icon
                  className="size-[21px]"
                  // A filled-feeling stroke on the active tab, so the
                  // selection survives being glanced at in a mirror.
                  strokeWidth={active ? 2.4 : 1.9}
                  aria-hidden
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
