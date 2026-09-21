"use client";

import { useActionState, useState } from "react";
import { UserPlus, Loader2, Check, TriangleAlert, ChevronDown } from "lucide-react";
import { createMember, type ActionResult } from "@/app/app/users/actions";
import { normalizeUsername, usernameProblem } from "@/lib/auth";

const ROLES = [
  ["student", "شاگرد"],
  ["coach", "مربی"],
  ["admin", "مدیر"],
] as const;

export function CreateMemberForm() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createMember,
    null
  );

  // Checked as they type so the mistake surfaces before they submit,
  // but the server validates again — this is a courtesy, not a gate.
  const liveProblem = username ? usernameProblem(normalizeUsername(username)) : null;

  return (
    <section className="fc-raised overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-5 text-start"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-fc-cyan/25 bg-fc-cyan/10 text-fc-cyan">
          <UserPlus className="size-[18px]" />
        </span>
        <span className="flex-1">
          <b className="block text-[14.5px]">ساخت کاربر جدید</b>
          <small className="text-[12px] text-fc-muted">
            نام کاربری و رمز بسازید و به عضو بدهید
          </small>
        </span>
        <ChevronDown
          className={`size-[18px] shrink-0 text-fc-muted transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <form action={formAction} className="border-t border-[var(--fc-line)] p-5">
          <label htmlFor="full_name" className="mb-2 block text-[13px] font-bold">
            نام و نام خانوادگی
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="fc-input"
            placeholder="مثلاً نگار صادقی"
          />

          <label htmlFor="new_username" className="mt-4 mb-2 block text-[13px] font-bold">
            نام کاربری
          </label>
          <input
            id="new_username"
            name="username"
            required
            dir="ltr"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="fc-input fc-lat text-center tracking-[0.06em]"
            placeholder="negar"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={!!liveProblem}
            aria-describedby="username-hint"
          />
          <p
            id="username-hint"
            className={`mt-1.5 text-[11.5px] ${liveProblem ? "text-fc-bad" : "text-fc-dim"}`}
          >
            {liveProblem ?? "حروف انگلیسی کوچک، عدد و زیرخط. عضو با همین وارد می‌شود."}
          </p>

          <label htmlFor="new_password" className="mt-4 mb-2 block text-[13px] font-bold">
            رمز عبور
          </label>
          <input
            id="new_password"
            name="password"
            type="text"
            required
            minLength={8}
            dir="ltr"
            autoComplete="off"
            className="fc-input fc-lat text-center"
            placeholder="حداقل ۸ کاراکتر"
          />
          <p className="mt-1.5 text-[11.5px] text-fc-dim">
            رمز اینجا آشکار است تا بتوانید به عضو بدهید. بگویید بعداً عوضش کند.
          </p>

          <label htmlFor="new_phone" className="mt-4 mb-2 block text-[13px] font-bold">
            شماره موبایل <span className="font-normal text-fc-dim">(اختیاری)</span>
          </label>
          <input
            id="new_phone"
            name="phone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            className="fc-input fc-lat text-center tracking-[0.1em]"
            placeholder="09123456789"
          />
          <p className="mt-1.5 text-[11.5px] text-fc-dim">
            برای ورود با کد پیامکی، بعد از اتصال sms.ir.
          </p>

          <fieldset className="mt-4">
            <legend className="mb-2 text-[13px] font-bold">نقش</legend>
            <div className="flex gap-2">
              {ROLES.map(([value, label], i) => (
                <label
                  key={value}
                  className="fc-card flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 text-[13px] has-checked:border-fc-cyan has-checked:text-fc-cyan"
                >
                  <input
                    type="radio"
                    name="role"
                    value={value}
                    defaultChecked={i === 0}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          {state && (
            <p
              role="status"
              className={`mt-4 flex items-start gap-2 text-[12.5px] ${
                state.ok ? "text-fc-ok" : "text-fc-bad"
              }`}
            >
              {state.ok ? (
                <Check className="mt-0.5 size-4 shrink-0" />
              ) : (
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
              )}
              {state.message}
            </p>
          )}

          <button type="submit" className="fc-btn mt-5 w-full" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="size-[18px] animate-spin" />
                در حال ساخت…
              </>
            ) : (
              <>
                <UserPlus className="size-[18px]" />
                ساخت کاربر
              </>
            )}
          </button>
        </form>
      )}
    </section>
  );
}
