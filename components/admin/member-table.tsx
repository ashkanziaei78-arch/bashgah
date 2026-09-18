"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck, UserCog } from "lucide-react";
import { setRole } from "@/app/admin/actions";
import { faDigits, daysUntil } from "@/lib/format";
import type { UserRole } from "@/lib/supabase/types";

export interface MemberRow {
  id: string;
  fullName: string;
  role: UserRole;
  isSelf: boolean;
  planName: string | null;
  expiresOn: string | null;
  sessionsLeft: number | null;
}

const ROLE_LABEL: Record<UserRole, string> = {
  student: "شاگرد",
  coach: "مربی",
  admin: "مدیر",
};

const ROLES: UserRole[] = ["student", "coach", "admin"];

export function MemberTable({ rows }: { rows: MemberRow[] }) {
  const [filter, setFilter] = useState<UserRole | "all">("all");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const visible = rows.filter(
    (row) =>
      (filter === "all" || row.role === filter) &&
      (query.trim() === "" || row.fullName.includes(query.trim()))
  );

  function change(row: MemberRow, role: UserRole) {
    setError(null);
    setBusyId(row.id);
    startTransition(async () => {
      const result = await setRole(row.id, role);
      setBusyId(null);
      if (!result.ok) {
        setError(result.message ?? "تغییر نقش ذخیره نشد.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <div className="mb-3 grid gap-2.5 sm:grid-cols-[1fr_auto]">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="جست‌وجوی نام"
          aria-label="جست‌وجوی نام"
          className="fc-input"
          style={{ fontSize: 16 }}
        />
        <div className="fc-scroll flex gap-1.5 overflow-x-auto">
          {(["all", ...ROLES] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`shrink-0 rounded-full border px-3.5 py-2 text-[12px] font-bold transition-colors ${
                filter === value
                  ? "border-fc-cyan bg-fc-cyan/12 text-fc-cyan"
                  : "border-[var(--fc-line2)] text-fc-muted hover:text-fc-text"
              }`}
            >
              {value === "all" ? "همه" : ROLE_LABEL[value]}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="mb-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="fc-card p-4 text-[13px] text-fc-muted">کسی با این مشخصات پیدا نشد.</p>
      ) : (
        <ul className="grid list-none gap-2.5 p-0">
          {visible.map((row) => (
            <li key={row.id} className="fc-card p-3.5">
              <div className="flex items-center gap-3">
                <span
                  className="fc-lat grid size-11 shrink-0 place-items-center rounded-full text-[12px] font-extrabold text-white"
                  style={{ background: "var(--fc-grad)" }}
                >
                  {row.fullName.split(" ").map((w) => w[0]).slice(0, 2).join(" ")}
                </span>

                <div className="min-w-0 flex-1">
                  <b className="flex items-center gap-1.5 text-[13.5px]">
                    {row.fullName}
                    {row.role !== "student" && (
                      <ShieldCheck className="size-3.5 shrink-0 text-fc-cyan" />
                    )}
                  </b>
                  <small className="text-[11.5px] text-fc-dim">
                    {row.role === "student"
                      ? row.planName
                        ? `${row.planName} · ${faDigits(daysUntil(row.expiresOn!))} روز مانده${
                            row.sessionsLeft !== null
                              ? ` · ${faDigits(row.sessionsLeft)} جلسه`
                              : ""
                          }`
                        : "بدون اشتراک فعال"
                      : ROLE_LABEL[row.role]}
                  </small>
                </div>

                {row.role === "student" && (
                  <Link
                    href={`/coach/${row.id}`}
                    className="fc-chip shrink-0 transition-colors hover:text-fc-cyan"
                  >
                    پرونده
                  </Link>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-2 border-t border-[var(--fc-line)] pt-2.5">
                <label
                  htmlFor={`role-${row.id}`}
                  className="flex shrink-0 items-center gap-1.5 text-[11.5px] text-fc-muted"
                >
                  <UserCog className="size-3.5" />
                  نقش
                </label>

                <select
                  id={`role-${row.id}`}
                  value={row.role}
                  disabled={row.isSelf || busyId === row.id}
                  onChange={(e) => change(row, e.target.value as UserRole)}
                  className="fc-input flex-1 disabled:opacity-45"
                  style={{ fontSize: 16, minHeight: 40, padding: "8px 12px" }}
                >
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABEL[role]}
                    </option>
                  ))}
                </select>

                {busyId === row.id && (
                  <Loader2 className="size-4 shrink-0 animate-spin text-fc-cyan" />
                )}
              </div>

              {row.isSelf && (
                <p className="mt-1.5 text-[11.5px] text-fc-muted">
                  نقش خودتان قابل تغییر نیست — جلوی قفل‌شدن بیرون از پنل را می‌گیرد.
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
