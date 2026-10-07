"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Building2, Dumbbell, Flame, KeyRound, Loader2, UserPlus, Copy, Check } from "lucide-react";
import { createGym, updateGym, createGymUser } from "@/app/platform/actions";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
function suggestPassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

function KindPicker({ value, onChange }: { value: "bodybuilding" | "crossfit"; onChange: (v: "bodybuilding" | "crossfit") => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {([
        ["bodybuilding", "بدنسازی", Dumbbell, "همان اپ اصلی؛ کلاس گروهی خاموش"],
        ["crossfit", "کراسفیت", Flame, "کلاس‌های WOD و مسابقه روشن"],
      ] as const).map(([k, label, Icon, hint]) => (
        <button key={k} type="button" aria-pressed={value === k} onClick={() => onChange(k)}
          className={`grid gap-1 rounded-xl border p-3 text-start ${value === k ? "border-fc-cyan bg-fc-cyan/10" : "border-[var(--fc-line)]"}`}>
          <span className="flex items-center gap-2 text-[14px] font-bold"><Icon className="size-4 text-fc-cyan" />{label}</span>
          <small className="text-[11.5px] text-fc-muted">{hint}</small>
        </button>
      ))}
    </div>
  );
}

export function NewGymForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [kind, setKind] = useState<"bodybuilding" | "crossfit">("bodybuilding");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createGym({ name, slug, kind });
          if (r.ok && r.id) router.push(`/platform/${r.id}`);
          else setError(r.message ?? "ساخت انجام نشد.");
        });
      }}
      className="fc-raised grid gap-4 p-5"
    >
      <h2 className="flex items-center gap-2 text-[15px]"><Building2 className="size-5 text-fc-cyan" />باشگاه تازه</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نام باشگاه
          <input className="fc-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} placeholder="باشگاه آریا" />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          شناسه (انگلیسی)
          <input className="fc-input fc-lat normal-case" dir="ltr" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase())} required maxLength={40} placeholder="arya-gym" />
        </label>
      </div>
      <KindPicker value={kind} onChange={setKind} />
      <p className="text-[11.5px] text-fc-muted">پلن‌ها، کتابخانه‌ی حرکات و تنظیمات از باشگاه اول کپی می‌شود تا مدیرش فقط ویرایش کند.</p>
      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Building2 className="size-[18px]" />}
        ساخت باشگاه
      </button>
      {error && <p role="alert" className="text-center text-[12.5px] text-fc-bad">{error}</p>}
    </form>
  );
}

export function GymSettings({
  gym,
}: {
  gym: { id: string; name: string; kind: "bodybuilding" | "crossfit"; classes_enabled: boolean; events_enabled: boolean; is_active: boolean };
}) {
  const [name, setName] = useState(gym.name);
  const [kind, setKind] = useState(gym.kind);
  const [classes, setClasses] = useState(gym.classes_enabled);
  const [events, setEvents] = useState(gym.events_enabled);
  const [active, setActive] = useState(gym.is_active);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const toggle = (label: string, hint: string, v: boolean, set: (b: boolean) => void) => (
    <label className="flex items-center gap-3 rounded-xl border border-[var(--fc-line)] p-3">
      <input type="checkbox" checked={v} onChange={(e) => set(e.target.checked)} className="size-5 accent-[var(--color-fc-cyan)]" />
      <span><b className="block text-[13.5px]">{label}</b><small className="text-[11.5px] text-fc-muted">{hint}</small></span>
    </label>
  );
  return (
    <section className="fc-raised grid gap-3 p-5">
      <h2 className="text-[15px]">تنظیمات باشگاه</h2>
      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        نام
        <input className="fc-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
      </label>
      <KindPicker value={kind} onChange={(k) => { setKind(k); if (k === "crossfit") setClasses(true); }} />
      {toggle("کلاس‌های گروهی", "برنامه‌ی کلاس، رزرو و صف انتظار", classes, setClasses)}
      {toggle("مسابقه و رویداد", "ثبت‌نام، نتایج و جدول رتبه", events, setEvents)}
      {toggle("فعال", "غیرفعال کردن، ورود اعضا و کارکنان این باشگاه را می‌بندد", active, setActive)}
      <button type="button" disabled={pending} className="fc-btn"
        onClick={() => { setMsg(null); start(async () => {
          const r = await updateGym({ id: gym.id, name, kind, classes, events, active });
          setMsg(r.ok ? { ok: true, text: "ذخیره شد." } : { ok: false, text: r.message ?? "ذخیره نشد." });
        }); }}>
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : null}
        ذخیره
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-center text-[12.5px] ${msg.ok ? "text-fc-ok" : "text-fc-bad"}`}>{msg.text}</p>}
    </section>
  );
}

export function GymUserForm({ gymId }: { gymId: string }) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(() => suggestPassword());
  const [role, setRole] = useState<"admin" | "coach">("admin");
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (done) {
    return (
      <div className="fc-raised grid gap-3 p-5">
        <p className="text-[13.5px] font-bold text-fc-ok">حساب ساخته شد. این را همین حالا به صاحب باشگاه بدهید؛ رمز دوباره نشان داده نمی‌شود.</p>
        <p className="fc-lat rounded-xl bg-fc-ink p-3 text-[14px] normal-case" dir="ltr">{done.username} / {done.password}</p>
        <div className="flex gap-2">
          <button type="button" className="fc-btn fc-btn-ghost" onClick={async () => { await navigator.clipboard.writeText(`${done.username} / ${done.password}`); setCopied(true); }}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}کپی
          </button>
          <button type="button" className="fc-btn" onClick={() => { setDone(null); setFullName(""); setUsername(""); setPassword(suggestPassword()); setCopied(false); }}>حساب دیگر</button>
        </div>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await createGymUser({ gymId, username, password, fullName, role });
          if (r.ok) setDone({ username: username.trim().toLowerCase(), password });
          else setError(r.message ?? "ساخت انجام نشد.");
        });
      }}
      className="fc-raised grid gap-3 p-5"
    >
      <h2 className="flex items-center gap-2 text-[15px]"><UserPlus className="size-5 text-fc-cyan" />حساب مدیر یا مربی برای این باشگاه</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نام و نام خانوادگی
          <input className="fc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} required maxLength={60} />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نقش
          <select className="fc-input" value={role} onChange={(e) => setRole(e.target.value as "admin" | "coach")}>
            <option value="admin">مدیر باشگاه</option>
            <option value="coach">مربی</option>
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نام کاربری
          <input className="fc-input fc-lat normal-case" dir="ltr" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required pattern="[a-z0-9_]{3,32}" />
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          <span className="flex items-center gap-1"><KeyRound className="size-3.5" />رمز</span>
          <div className="flex gap-2">
            <input className="fc-input fc-lat flex-1 normal-case" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            <button type="button" className="fc-btn fc-btn-ghost shrink-0 px-3" onClick={() => setPassword(suggestPassword())}>تازه</button>
          </div>
        </label>
      </div>
      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <UserPlus className="size-[18px]" />}
        ساخت حساب
      </button>
      {error && <p role="alert" className="text-center text-[12.5px] text-fc-bad">{error}</p>}
    </form>
  );
}
