"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronRight, Loader2, Eye, EyeOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toE164, faDigits } from "@/lib/format";

const RESEND_SECONDS = 90;

type Method = "password" | "otp";

/** Supabase returns machine codes; members need a sentence that tells them
 *  what to do next. Anything unmapped falls through to a generic line
 *  rather than leaking an English error into a Persian screen. */
function persianError(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "شماره موبایل یا رمز عبور درست نیست.";
    case "phone_provider_disabled":
      return "ورود با شماره موبایل هنوز روی سرور فعال نشده است. با مدیر باشگاه تماس بگیرید.";
    case "over_request_rate_limit":
    case "over_sms_send_rate_limit":
      return "تعداد تلاش‌ها زیاد بود. چند دقیقه صبر کنید و دوباره امتحان کنید.";
    case "otp_expired":
      return "کد منقضی شده. دوباره درخواست کد بدهید.";
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

  const [method, setMethod] = useState<Method>("password");
  const [step, setStep] = useState<"enter" | "code">("enter");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const phoneRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  function readPhone(): string | null {
    const e164 = toE164(phone);
    if (!e164) {
      setError("شماره موبایل درست نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.");
      phoneRef.current?.focus();
      return null;
    }
    return e164;
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const e164 = readPhone();
    if (!e164) return;
    if (password.length < 6) {
      setError("رمز عبور حداقل ۶ کاراکتر است.");
      passwordRef.current?.focus();
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      phone: e164,
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

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const e164 = readPhone();
    if (!e164) return;

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);

    if (err) {
      setError(persianError(err.code, "ارسال کد ناموفق بود. کمی بعد دوباره تلاش کنید."));
      return;
    }
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const e164 = readPhone();
    if (!e164) return;
    if (code.length < 4) {
      setError("کد را کامل وارد کنید.");
      codeRef.current?.focus();
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.verifyOtp({
      phone: e164,
      token: code,
      type: "sms",
    });
    setBusy(false);

    if (err) {
      setError(persianError(err.code, "کد درست نیست. دوباره تلاش کنید."));
      codeRef.current?.focus();
      return;
    }
    router.push(next);
    router.refresh();
  }

  const errorBlock = error && (
    <p role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
      {error}
    </p>
  );

  const phoneField = (
    <>
      <label htmlFor="phone" className="mb-2 block text-[13px] font-bold">
        شماره موبایل
      </label>
      <input
        id="phone"
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="username"
        dir="ltr"
        placeholder="09123456789"
        ref={phoneRef}
        className="fc-input fc-lat text-center tracking-[0.1em]"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        aria-invalid={!!error}
      />
    </>
  );

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
          {step === "code" ? (
            <form onSubmit={verifyCode}>
              <h1 className="mb-2 text-xl">کد تأیید</h1>
              <p className="mb-6 text-[13.5px] text-fc-muted">
                کد پیامک‌شده به{" "}
                <b dir="ltr" className="fc-lat text-fc-text">
                  {faDigits(phone)}
                </b>{" "}
                را وارد کنید.
              </p>

              <label htmlFor="code" className="mb-2 block text-[13px] font-bold">
                کد شش رقمی
              </label>
              <input
                id="code"
                name="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                dir="ltr"
                placeholder="------"
                ref={codeRef}
                className="fc-input fc-lat text-center text-xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                aria-invalid={!!error}
              />
              {errorBlock}

              <button type="submit" className="fc-btn mt-5 w-full" disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 className="size-[18px] animate-spin" />
                    در حال بررسی…
                  </>
                ) : (
                  "ورود"
                )}
              </button>

              <div className="mt-4 flex items-center justify-between text-[12.5px]">
                <button
                  type="button"
                  className="min-h-11 text-fc-muted hover:text-fc-cyan"
                  onClick={() => {
                    setStep("enter");
                    setCode("");
                    setError(null);
                  }}
                >
                  تغییر شماره
                </button>
                <button
                  type="button"
                  className="min-h-11 text-fc-cyan disabled:text-fc-dim"
                  disabled={cooldown > 0 || busy}
                  onClick={() => sendCode()}
                >
                  {cooldown > 0
                    ? `ارسال دوباره تا ${faDigits(cooldown)} ثانیه`
                    : "ارسال دوباره کد"}
                </button>
              </div>
            </form>
          ) : (
            <>
              <h1 className="mb-2 text-xl">ورود به باشگاه</h1>
              <p className="mb-5 text-[13.5px] text-fc-muted">
                شماره موبایلتان نام کاربری شماست.
              </p>

              <div
                role="tablist"
                aria-label="روش ورود"
                className="mb-6 flex gap-1 rounded-xl border border-[var(--fc-line)] bg-fc-ink p-1"
              >
                {(
                  [
                    ["password", "رمز عبور"],
                    ["otp", "کد پیامکی"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    role="tab"
                    type="button"
                    aria-selected={method === value}
                    onClick={() => {
                      setMethod(value);
                      setError(null);
                    }}
                    className={`min-h-11 flex-1 rounded-lg text-[13.5px] font-bold transition-colors ${
                      method === value
                        ? "bg-fc-navy text-fc-text"
                        : "text-fc-muted hover:text-fc-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {method === "password" ? (
                <form onSubmit={signInWithPassword}>
                  {phoneField}

                  <label
                    htmlFor="password"
                    className="mt-4 mb-2 block text-[13px] font-bold"
                  >
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
                      {showPassword ? (
                        <EyeOff className="size-[18px]" />
                      ) : (
                        <Eye className="size-[18px]" />
                      )}
                    </button>
                  </div>
                  {errorBlock}

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
              ) : (
                <form onSubmit={sendCode}>
                  {phoneField}
                  {errorBlock}

                  <button type="submit" className="fc-btn mt-5 w-full" disabled={busy}>
                    {busy ? (
                      <>
                        <Loader2 className="size-[18px] animate-spin" />
                        در حال ارسال…
                      </>
                    ) : (
                      <>
                        دریافت کد
                        <ChevronRight className="size-[18px] rotate-180" />
                      </>
                    )}
                  </button>

                  <p className="mt-4 text-center text-[12px] text-fc-muted">
                    کد به همین شماره پیامک می‌شود.
                  </p>
                </form>
              )}
            </>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-fc-dim">
          هنوز عضو نیستید؟ در باشگاه ثبت‌نام کنید تا حسابتان ساخته شود.
        </p>
      </div>
    </main>
  );
}
