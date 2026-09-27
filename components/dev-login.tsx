"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

const ACCOUNTS = [
  { username: "amir", name: "امیر محمدی", role: "شاگرد", to: "/app" },
  { username: "ali", name: "علی رضایی", role: "مربی", to: "/coach" },
  { username: "admin", name: "مدیر باشگاه", role: "ادمین", to: "/admin" },
];

/** The seeded password used to be a literal in this file, which put a
 *  working admin login for the live project into a public repository.
 *  It now comes from the environment, so the repo carries no credential
 *  and each deployment picks its own. */
const DEV_PASSWORD = process.env.NEXT_PUBLIC_DEV_PASSWORD ?? "";

export function DevLogin() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function signIn(username: string, to: string) {
    setBusy(username);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password: DEV_PASSWORD,
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
          <p className="mb-6 text-[13px] text-fc-muted">
            ورود سریع برای توسعه. این صفحه در نسخه‌ی نهایی وجود ندارد و برای
            کار کردن به NEXT_PUBLIC_DEV_PASSWORD در .env.local نیاز دارد.
          </p>

          <ul className="grid list-none gap-2.5 p-0">
            {ACCOUNTS.map((a) => (
              <li key={a.username}>
                <button
                  type="button"
                  onClick={() => signIn(a.username, a.to)}
                  disabled={busy !== null}
                  className="fc-card flex w-full items-center gap-3 p-3.5 text-start transition-colors hover:border-[var(--fc-line2)] disabled:opacity-50"
                >
                  <span
                    className="fc-lat grid size-10 shrink-0 place-items-center rounded-full text-xs font-extrabold text-white"
                    style={{ background: "var(--fc-grad)" }}
                  >
                    {a.name.split(" ").map((w) => w[0]).slice(0, 2).join(" ")}
                  </span>
                  <span className="flex-1">
                    <b className="block text-[13.5px]">{a.name}</b>
                    <small className="text-[11.5px] text-fc-dim">{a.role}</small>
                  </span>
                  {busy === a.username && <Loader2 className="size-4 animate-spin text-fc-cyan" />}
                </button>
              </li>
            ))}
          </ul>

          {error && (
            <p role="alert" className="mt-4 text-[12.5px] text-fc-bad">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
