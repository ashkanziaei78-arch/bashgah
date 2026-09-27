"use client";

import { useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isValidUsername, usernameToEmail } from "@/lib/auth";

/** Supabase returns machine codes; members need a sentence that tells
 *  them what to do next. Anything unmapped falls through to a generic
 *  line rather than leaking an English error into a Persian screen. */
function persianError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      // Deliberately does not say which of the two was wrong: that
      // difference is how an outsider confirms a username exists.
      return "نام کاربری یا رمز عبور درست نیست.";
    case "email_provider_disabled":
      return "ورود روی سرور فعال نشده است. با مدیر باشگاه تماس بگیرید.";
    case "over_request_rate_limit":
      return "تعداد تلاش‌ها زیاد بود. چند دقیقه صبر کنید و دوباره امتحان کنید.";
    case "validation_failed":
      return "اطلاعات وارد شده کامل نیست.";
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

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidUsername(username)) {
      setError("نام کاربری بین ۳ تا ۳۲ نویسه، شامل حروف کوچک انگلیسی، عدد و زیرخط است.");
      usernameRef.current?.focus();
      return;
    }
    if (password.length < 8) {
      setError("رمز عبور حداقل ۸ نویسه است.");
      passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
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

        <div className="fc-raised p-7">
          <h1 className="mb-2 text-xl">ورود به باشگاه</h1>
          <p className="mb-6 text-[13.5px] text-fc-muted">
            نام کاربری و رمزتان را پذیرش باشگاه به شما می‌دهد.
          </p>

          <form onSubmit={signIn}>
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
              placeholder="ali"
              ref={usernameRef}
              className="fc-input text-center"
              style={{ letterSpacing: "0.04em" }}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              aria-invalid={!!error}
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
              <p role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
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
        </div>

        <p className="mt-5 text-center text-[12px] text-fc-dim">
          هنوز عضو نیستید؟ در باشگاه ثبت‌نام کنید تا حسابتان ساخته شود.
        </p>
      </div>
    </main>
  );
}
