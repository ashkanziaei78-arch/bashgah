"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserRound } from "lucide-react";
import { toGregorian, toJalaali } from "jalaali-js";
import { updateMyProfile, type ProfileInput } from "@/app/app/profile/actions";
import { ACTIVITY_LABEL, GOAL_LABEL } from "@/lib/nutrition";
import { faDigits } from "@/lib/format";

const MONTHS = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Birth date in the calendar members actually know it in. */
function splitJalali(iso: string | null) {
  if (!iso) return { y: "", m: "", d: "" };
  const [gy, gm, gd] = iso.split("-").map(Number);
  const j = toJalaali(gy, gm, gd);
  return { y: String(j.jy), m: String(j.jm), d: String(j.jd) };
}

export function ProfileForm({
  initial,
}: {
  initial: {
    fullName: string;
    birthDate: string | null;
    sex: "male" | "female" | null;
    heightCm: number | null;
    weightKg: number | null;
    goal: "gain" | "lose" | "maintain";
    activityLevel: number;
  };
}) {
  const router = useRouter();
  const [fullName, setFullName] = useState(initial.fullName);
  const [birth, setBirth] = useState(splitJalali(initial.birthDate));
  const [sex, setSex] = useState(initial.sex);
  const [height, setHeight] = useState(initial.heightCm ? String(initial.heightCm) : "");
  const [weight, setWeight] = useState(initial.weightKg ? String(initial.weightKg) : "");
  const [goal, setGoal] = useState(initial.goal);
  const [activity, setActivity] = useState(initial.activityLevel);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const thisYear = toJalaali(new Date()).jy;
  const years = Array.from({ length: 80 }, (_, i) => thisYear - 10 - i);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    let birthDate: string | null = null;
    if (birth.y && birth.m && birth.d) {
      const g = toGregorian(Number(birth.y), Number(birth.m), Number(birth.d));
      birthDate = `${g.gy}-${pad(g.gm)}-${pad(g.gd)}`;
    }
    const num = (v: string) => (v.trim() === "" ? null : Number(v.replace(/[۰-۹]/g, (c) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(c)))));
    const input: ProfileInput = {
      fullName, birthDate, sex,
      heightCm: num(height), weightKg: num(weight),
      goal, activityLevel: activity,
    };
    start(async () => {
      const r = await updateMyProfile(input);
      if (r.ok) {
        setMsg({ ok: true, text: "ذخیره شد. هدف کالری با اطلاعات تازه حساب می‌شود." });
        router.refresh();
      } else setMsg({ ok: false, text: r.message ?? "ذخیره نشد." });
    });
  }

  const label = "grid gap-1.5 text-[12.5px] text-fc-muted";

  return (
    <form onSubmit={submit} className="fc-card grid gap-4 p-5">
      <h2 className="flex items-center gap-2 text-[15px]">
        <UserRound className="size-5 text-fc-cyan" />
        اطلاعات شخصی
      </h2>

      <label className={label}>
        نام و نام خانوادگی
        <input className="fc-input" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={60} required />
      </label>

      <fieldset className="grid gap-1.5">
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">تاریخ تولد</legend>
        <div className="grid grid-cols-3 gap-2">
          <select className="fc-input" aria-label="روز" value={birth.d} onChange={(e) => setBirth({ ...birth, d: e.target.value })}>
            <option value="">روز</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{faDigits(d)}</option>)}
          </select>
          <select className="fc-input" aria-label="ماه" value={birth.m} onChange={(e) => setBirth({ ...birth, m: e.target.value })}>
            <option value="">ماه</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select className="fc-input" aria-label="سال" value={birth.y} onChange={(e) => setBirth({ ...birth, y: e.target.value })}>
            <option value="">سال</option>
            {years.map((y) => <option key={y} value={y}>{faDigits(y)}</option>)}
          </select>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">جنسیت</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["male", "female"] as const).map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sex === s}
              onClick={() => setSex(s)}
              className={`rounded-xl border px-3 py-2.5 text-[13px] font-bold ${sex === s ? "border-fc-cyan bg-fc-cyan/10 text-fc-text" : "border-[var(--fc-line2)] text-fc-muted"}`}
            >
              {s === "male" ? "آقا" : "خانم"}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className={label}>
          قد (سانتی‌متر)
          <input className="fc-input fc-num" inputMode="decimal" value={height} onChange={(e) => setHeight(e.target.value)} placeholder="۱۷۵" />
        </label>
        <label className={label}>
          وزن (کیلوگرم)
          <input className="fc-input fc-num" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="۷۸" />
        </label>
      </div>

      <fieldset>
        <legend className="mb-1.5 text-[12.5px] text-fc-muted">هدف</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["lose", "maintain", "gain"] as const).map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={goal === g}
              onClick={() => setGoal(g)}
              className={`rounded-xl border px-2 py-2.5 text-[12.5px] font-bold ${goal === g ? "border-fc-cyan bg-fc-cyan/10 text-fc-text" : "border-[var(--fc-line2)] text-fc-muted"}`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
      </fieldset>

      <label className={label}>
        میزان تمرین در هفته
        <select className="fc-input" value={activity} onChange={(e) => setActivity(Number(e.target.value))}>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{ACTIVITY_LABEL[n]}</option>)}
        </select>
      </label>

      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Check className="size-[18px]" />}
        ذخیره‌ی اطلاعات
      </button>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={`text-center text-[12.5px] ${msg.ok ? "text-fc-ok" : "text-fc-bad"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
