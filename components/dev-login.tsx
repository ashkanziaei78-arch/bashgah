"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ACCOUNTS = [
  { email: "amir@demo.fitclub", name: "امیر محمدی", role: "شاگرد", to: "/app" },
  { email: "ali@demo.fitclub", name: "علی رضایی", role: "مربی", to: "/app" },
  { email: "admin@demo.fitclub", name: "مدیر باشگاه", role: "ادمین", to: "/app" },
];

export function DevLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(email: string, to: string) {
    setBusy(email);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password: "demo1234",
    });
    setBusy(null);
    if (err) {
      setError(err.message);
      return;
    }
    router.push(to);
    router.refresh();
  }

  return (
    <main className="grid min-h-dvh place-items-center px-5 py-10">
      <div className="w-full max-w-[420px]">
        <div className="fc-chip fc-chip-warn mx-auto mb-5 flex w-fit">
          <TriangleAlert className="size-3.5" />
          فقط در حالت توسعه
        </div>

        <div className="fc-raised p-6">
          <h1 className="mb-2 text-xl">ورود سریع به حساب‌های نمونه</h1>
          <p className="mb-6 text-sm text-fc-muted">
            تا وقتی سرویس پیامک وصل نشده، از اینجا وارد شوید. این صفحه در نسخه‌ی
            نهایی وجود ندارد.
          </p>

          <ul className="grid list-none gap-2.5 p-0">
            {ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => signIn(a.email, a.to)}
                  disabled={busy !== null}
                  className="fc-card flex w-full items-center gap-3 p-3.5 text-start transition-colors hover:border-[var(--fc-line2)] disabled:opacity-50"
                >
                  <span className="fc-avatar size-10 shrink-0 text-xs" aria-hidden>
                    {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                  </span>
                  <span className="flex-1">
                    <b className="block text-sm">{a.name}</b>
                    <small className="text-xs text-fc-dim">{a.role}</small>
                  </span>
                  {busy === a.email && <Loader2 className="size-4 animate-spin text-fc-cyan" />}
                </button>
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="mt-4 text-sm text-fc-bad">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
