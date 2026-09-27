"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { usernameToEmail } from "@/lib/auth";

const MIN_LENGTH = 8;

/** Changes the signed-in user's own password.
 *
 *  Supabase's updateUser() will set a new password from an active
 *  session without asking for the old one, which means a borrowed phone
 *  left unlocked is enough to lock the owner out of their account. So
 *  the current password is verified first, by signing in with it: if
 *  those credentials are not good, nothing is changed.
 */
export function ChangePassword({ username }: { username: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(false);

    if (next.length < MIN_LENGTH) {
      setError(`رمز تازه حداقل ${MIN_LENGTH} نویسه است.`);
      return;
    }
    if (next !== confirm) {
      setError("رمز تازه و تکرارش یکی نیستند.");
      return;
    }
    if (next === current) {
      setError("رمز تازه با رمز فعلی فرقی ندارد.");
      return;
    }

    setBusy(true);
    const supabase = createClient();

    // Re-authenticate before changing anything.
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password: current,
    });
    if (authError) {
      setBusy(false);
      setError("رمز فعلی درست نیست.");
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    setBusy(false);

    if (updateError) {
      setError("تغییر رمز انجام نشد. دوباره تلاش کنید.");
      return;
    }

    setDone(true);
    setCurrent("");
    setNext("");
    setConfirm("");
    router.refresh();
  }

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    autoComplete: string
  ) => (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[12.5px] text-fc-muted">
        {label}
      </label>
      <input
        id={id}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        dir="ltr"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="fc-input text-center"
        style={{ fontSize: 16 }}
      />
    </div>
  );

  return (
    <form onSubmit={submit} className="fc-card grid gap-3 p-4">
      <h2 className="flex items-center gap-2 text-[14.5px]">
        <KeyRound className="size-4 text-fc-cyan" />
        تغییر رمز عبور
      </h2>

      {field("cur-pass", "رمز فعلی", current, setCurrent, "current-password")}
      {field("new-pass", "رمز تازه", next, setNext, "new-password")}
      {field("rep-pass", "تکرار رمز تازه", confirm, setConfirm, "new-password")}

      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="flex items-center gap-1.5 justify-self-start text-[12px] text-fc-muted hover:text-fc-cyan"
      >
        {show ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        {show ? "پنهان‌کردن رمزها" : "نمایش رمزها"}
      </button>

      {error && (
        <p role="alert" className="text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
      {done && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-fc-ok">
          <Check className="size-4" />
          رمز عوض شد. دفعه‌ی بعد با رمز تازه وارد شوید.
        </p>
      )}

      <button type="submit" disabled={busy} className="fc-btn w-full">
        {busy ? <Loader2 className="size-[18px] animate-spin" /> : <KeyRound className="size-[18px]" />}
        ذخیره‌ی رمز تازه
      </button>
    </form>
  );
}
