"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Dumbbell, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toE164, faDigits } from "@/lib/format";

const RESEND_SECONDS = 90;

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/app";

  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);

    const e164 = toE164(phone);
    if (!e164) {
      setError("شماره موبایل درست نیست. مثل ۰۹۱۲۳۴۵۶۷۸۹ وارد کنید.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithOtp({ phone: e164 });
    setBusy(false);

    if (err) {
      setError("ارسال کد ناموفق بود. چند لحظه دیگر دوباره تلاش کنید.");
      return;
    }
    setStep("code");
    setCooldown(RESEND_SECONDS);
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const e164 = toE164(phone);
    if (!e164) return;
    if (code.length < 4) {
      setError("کد را کامل وارد کنید.");
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
      setError("کد درست نیست یا منقضی شده. دوباره تلاش کنید.");
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
          {step === "phone" ? (
            <form onSubmit={sendCode}>
              <h1 className="mb-2 text-xl">ورود به باشگاه</h1>
              <p className="mb-6 text-[13.5px] text-fc-muted">
                شماره موبایلتان را وارد کنید تا کد تأیید برایتان پیامک شود.
              </p>

              <label htmlFor="phone" className="mb-2 block text-[13px] font-bold">
                شماره موبایل
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
                placeholder="09123456789"
                className="fc-input fc-lat text-center tracking-[0.1em]"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                aria-invalid={!!error}
                aria-describedby={error ? "login-error" : undefined}
              />

              {error && (
                <p
                  id="login-error"
                  role="alert"
                  className="mt-2.5 text-[12.5px] text-fc-bad"
                >
                  {error}
                </p>
              )}

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
            </form>
          ) : (
            <form onSubmit={verify}>
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
                aria-describedby={error ? "code-error" : undefined}
              />

              {error && (
                <p id="code-error" role="alert" className="mt-2.5 text-[12.5px] text-fc-bad">
                  {error}
                </p>
              )}

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
                  className="text-fc-muted hover:text-fc-cyan"
                  onClick={() => {
                    setStep("phone");
                    setCode("");
                    setError(null);
                  }}
                >
                  تغییر شماره
                </button>
                <button
                  type="button"
                  className="text-fc-cyan disabled:text-fc-dim"
                  disabled={cooldown > 0 || busy}
                  onClick={() => sendCode()}
                >
                  {cooldown > 0
                    ? `ارسال دوباره تا ${faDigits(cooldown)} ثانیه`
                    : "ارسال دوباره کد"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-5 text-center text-[12px] text-fc-dim">
          با ورود، عضو باشگاه Fit Club می‌شوید.
        </p>
      </div>
    </main>
  );
}
