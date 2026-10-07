"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2, RefreshCw, UserPlus, X } from "lucide-react";
import { createAccount } from "@/app/admin/actions";
import { isValidUsername, normaliseUsername } from "@/lib/auth";
import type { UserRole } from "@/lib/supabase/types";

const ROLE_LABEL: Record<UserRole, string> = {
  student: "شاگرد",
  coach: "مربی",
  admin: "مدیر",
};

/* Readable at a counter and over the phone: no O/0 or l/1 confusion,
 * which is the whole problem with a random string somebody has to read
 * aloud to a member who is typing it on a phone. */
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

function suggestPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function AccountCreator() {
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<UserRole>("student");
  const [password, setPassword] = useState(suggestPassword);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function submit() {
    setError(null);

    if (!isValidUsername(username)) {
      setError("نام کاربری: ۳ تا ۳۲ نویسه، فقط حروف کوچک انگلیسی، عدد و زیرخط.");
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور حداقل ۸ نویسه است.");
      return;
    }

    startTransition(async () => {
      const result = await createAccount({ username, password, fullName, role });
      if (!result.ok) {
        setError(result.message ?? "ساخت حساب انجام نشد.");
        return;
      }
      // Shown once, because the password is hashed on the way in and
      // cannot be read back from anywhere afterwards.
      setDone({ username: normaliseUsername(username), password });
      setUsername("");
      setFullName("");
      setPassword(suggestPassword());
      router.refresh();
    });
  }

  if (done) {
    const line = `نام کاربری: ${done.username}\nرمز عبور: ${done.password}`;
    return (
      <div className="fc-card mb-3 p-4">
        <h2 className="mb-1.5 flex items-center gap-2 text-[14px] text-fc-ok">
          <Check className="size-4" />
          حساب ساخته شد
        </h2>
        <p className="mb-3 text-[12.5px] leading-relaxed text-fc-muted">
          این رمز فقط همین یک بار نشان داده می‌شود، رمزها رمزنگاری‌شده ذخیره
          می‌شوند و بعداً قابل خواندن نیستند. الان به عضو بدهیدش.
        </p>

        <dl className="mb-3 grid gap-1.5 rounded-xl border border-[var(--fc-line2)] bg-fc-ink p-3.5">
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[12px] text-fc-muted">نام کاربری</dt>
            <dd dir="ltr" className="fc-lat normal-case text-[13.5px] font-extrabold">{done.username}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3">
            <dt className="text-[12px] text-fc-muted">رمز عبور</dt>
            <dd dir="ltr" className="fc-lat normal-case text-[13.5px] font-extrabold text-fc-cyan">
              {done.password}
            </dd>
          </div>
        </dl>

        <div className="flex gap-2.5">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(line);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="fc-btn flex-1"
          >
            {copied ? <Check className="size-[18px]" /> : <Copy className="size-[18px]" />}
            {copied ? "کپی شد" : "کپی"}
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setOpen(true);
            }}
            className="fc-btn fc-btn-ghost shrink-0"
          >
            حساب بعدی
          </button>
          <button
            type="button"
            onClick={() => {
              setDone(null);
              setOpen(false);
            }}
            className="fc-btn fc-btn-ghost shrink-0"
          >
            بستن
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="fc-btn mb-3 w-full">
        <UserPlus className="size-[18px]" />
        ساخت حساب تازه
      </button>
    );
  }

  return (
    <div className="fc-card mb-3 grid gap-3 p-4">
      <div>
        <label htmlFor="ac-user" className="mb-1.5 block text-[12.5px] text-fc-muted">
          نام کاربری
        </label>
        <input
          id="ac-user"
          dir="ltr"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="ali_rezaei"
          className="fc-input fc-lat normal-case text-start"
          style={{ fontSize: 16, letterSpacing: "normal", textTransform: "none" }}
        />
        <p className="mt-1.5 text-[11.5px] text-fc-muted">
          فقط حروف کوچک انگلیسی، عدد و زیرخط. عضو با همین وارد می‌شود.
        </p>
      </div>

      <div>
        <label htmlFor="ac-name" className="mb-1.5 block text-[12.5px] text-fc-muted">
          نام و نام خانوادگی
        </label>
        <input
          id="ac-name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="علی رضایی"
          className="fc-input"
          style={{ fontSize: 16 }}
        />
      </div>

      <div>
        <label htmlFor="ac-role" className="mb-1.5 block text-[12.5px] text-fc-muted">
          نقش
        </label>
        <select
          id="ac-role"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
          className="fc-input"
          style={{ fontSize: 16 }}
        >
          {(["student", "coach", "admin"] as UserRole[]).map((r) => (
            <option key={r} value={r}>
              {ROLE_LABEL[r]}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="ac-pass" className="mb-1.5 block text-[12.5px] text-fc-muted">
          رمز عبور
        </label>
        <div className="flex gap-2">
          <input
            id="ac-pass"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="fc-input fc-lat normal-case flex-1 text-start"
            style={{ fontSize: 16, letterSpacing: "normal", textTransform: "none" }}
          />
          <button
            type="button"
            onClick={() => setPassword(suggestPassword())}
            aria-label="رمز تازه پیشنهاد بده"
            className="grid w-12 shrink-0 place-items-center rounded-xl border border-[var(--fc-line2)] text-fc-muted transition-colors hover:text-fc-cyan"
          >
            <RefreshCw className="size-4" />
          </button>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}

      <div className="flex gap-2.5">
        <button type="button" disabled={pending} onClick={submit} className="fc-btn flex-1">
          {pending ? <Loader2 className="size-[18px] animate-spin" /> : <UserPlus className="size-[18px]" />}
          ساخت حساب
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="fc-btn fc-btn-ghost shrink-0"
        >
          <X className="size-[18px]" />
          انصراف
        </button>
      </div>
    </div>
  );
}
