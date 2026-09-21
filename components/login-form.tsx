"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { normalizeUsername, usernameToEmail } from "@/lib/auth";

/** Supabase returns machine codes; members need a sentence telling them
 *  what to do. Credential failures deliberately stay vague so the form
 *  cannot be used to discover which usernames exist. */
function persianError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "نام کاربری یا رمز عبور درست نیست.";
    case "email_not_confirmed":
      return "حساب هنوز تأیید نشده. با پذیرش باشگاه تماس بگیرید.";
    case "over_request_rate_limit":
      return "تعداد تلاش‌ها زیاد بود. چند دقیقه صبر کنید.";
    case "user_banned":
      return "این حساب غیرفعال شده است.";
    default:
      return fallback;
  }
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const name = normalizeUsername(username);
    if (!name) {
      setError("نام کاربری را وارد کنید.");
      usernameRef.current?.focus();
      return;
    }
    if (!password) {
      setError("رمز عبور را وارد کنید.");
      passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(name),
      password,
    });
    setBusy(false);

    if (err) {
      setError(persianError(err.code, "ورود انجام نشد. دوباره تلاش کنید."));
      passwordRef.current?.focus();
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2.5">
          <div
            className="grid size-11 place-items-center rounded-xl"
            style={{ background: "var(--fc-grad)", boxShadow: "0 6px 20px -8px #00b2e3" }}
          >
            <Dumbbell className="size-6 text-white" strokeWidth={2.2} />
          </div>
          <b className="fc-lat text-lg tracking-[0.14em]">Fit Club</b>
        </Link>

        <form onSubmit={submit} className="fc-raised p-7">
          <h1 className="mb-2 text-xl">ورود به باشگاه</h1>
          <p className="mb-6 text-[13.5px] text-fc-muted">
            با نام کاربری و رمزی که باشگاه به شما داده وارد شوید.
          </p>

          <label htmlFor="username" className="mb-2 block text-[13px] font-bold">
            نام کاربری
          </label>
          <input
            id="username"
            name="username"
            type="text"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            dir="ltr"
            placeholder="amir"
            ref={usernameRef}
            className="fc-input fc-lat text-center tracking-[0.06em]"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            aria-invalid={!!error}
            aria-describedby={error ? "login-error" : undefined}
          />

          <label htmlFor="password" className="mt-4 mb-2 block text-[13px] font-bold">
            رمز عبور
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              dir="ltr"
              ref={passwordRef}
              className="fc-input pe-12 text-center"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "login-error" : undefined}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
              className="absolute inset-y-0 end-0 grid w-12 place-items-center text-fc-muted hover:text-fc-text"
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>

          {error && (
            <p id="login-error" role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
              {error}
            </p>
          )}

          <button type="submit" className="fc-btn mt-5 w-full" disabled={busy}>
            {busy ? (
              <>
                <Loader2 className="size-[18px] animate-spin" />
                در حال ورود…
              </>
            ) : (
              <>
                ورود
                <ChevronRight className="size-[18px] rotate-180" />
              </>
            )}
          </button>

          <p className="mt-4 text-center text-[12px] text-fc-muted">
            رمزتان را فراموش کرده‌اید؟ از پذیرش باشگاه بخواهید بازنشانی کند.
          </p>
        </form>

        <p className="mt-5 text-center text-[12px] text-fc-dim">
          هنوز عضو نیستید؟ در باشگاه ثبت‌نام کنید تا حسابتان ساخته شود.
        </p>
      </div>
    </main>
  );
}
