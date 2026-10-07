"use client";

import { useMemo, useState, useTransition } from "react";
import { GalleryHorizontal, Link2, Loader2, Megaphone, Trash2 } from "lucide-react";
import { ImageUpload } from "@/components/image-upload";
import { saveAnnouncement, deleteAnnouncement } from "@/app/admin/engage-actions";
import { TONE } from "@/components/engage/tone";
import { faDate, faDigits, todayInTehran } from "@/lib/format";

const LENGTHS = [0, 1, 3, 7, 14, 30];

function addDays(day: string, n: number) {
  return new Date(Date.parse(`${day}T12:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

export function AnnouncementForm({ gymId }: { gymId: string }) {
  const today = todayInTehran();
  const starts = useMemo(() => [0, 1, 2, 3, 7].map((n) => addDays(today, n)), [today]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tone, setTone] = useState<"info" | "offer" | "alert">("info");
  const [pinned, setPinned] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [banner, setBanner] = useState(true);
  const [from, setFrom] = useState(starts[0]);
  const [length, setLength] = useState(7);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const r = await saveAnnouncement({
        title, body, tone, pinned, publishFrom: from,
        publishUntil: length ? addDays(from, length - 1) : null,
        imagePath: image, link, showInBanner: banner && Boolean(image),
      });
      if (r.ok) {
        setTitle(""); setBody(""); setPinned(false); setImage(null); setLink("");
        setMsg({ ok: true, text: "اطلاعیه منتشر شد." });
      } else setMsg({ ok: false, text: r.message ?? "ثبت نشد." });
    });
  }

  return (
    <form onSubmit={submit} className="fc-raised grid gap-4 p-5">
      <h2 className="flex items-center gap-2 text-[15px]">
        <Megaphone className="size-5 text-fc-cyan" />
        اطلاعیه‌ی تازه
      </h2>
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(TONE) as (keyof typeof TONE)[]).map((k) => {
          const T = TONE[k];
          const Icon = T.icon;
          return (
            <button
              key={k}
              type="button"
              aria-pressed={tone === k}
              onClick={() => setTone(k)}
              className={`flex items-center justify-center gap-1.5 rounded-xl border px-2 py-2.5 text-[12px] font-bold ${
                tone === k ? "border-fc-cyan bg-fc-cyan/10 text-fc-text" : "border-[var(--fc-line)] text-fc-muted"
              }`}
            >
              <Icon className="size-4" style={{ color: T.color }} />
              {T.label}
            </button>
          );
        })}
      </div>
      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        عنوان
        <input className="fc-input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} required placeholder="مثلاً باشگاه جمعه تعطیل است" />
      </label>
      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        متن (اختیاری)
        <textarea className="fc-input min-h-24" value={body} onChange={(e) => setBody(e.target.value)} maxLength={600} />
        <span className="fc-num text-left text-[11px]">{faDigits(body.length)}/{faDigits(600)}</span>
      </label>
      <ImageUpload
        bucket="gym-media"
        folder={gymId}
        value={image}
        onChange={setImage}
        label="عکس بنر (اختیاری)"
        aspect="aspect-[16/7]"
      />
      {image && (
        <label className="flex items-center gap-2 text-[13px]">
          <input type="checkbox" checked={banner} onChange={(e) => setBanner(e.target.checked)} className="size-4" />
          <GalleryHorizontal className="size-4 text-fc-cyan" />
          در بنر بالای صفحه‌ی اول اعضا نشان داده شود
        </label>
      )}
      <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
        <span className="flex items-center gap-1.5"><Link2 className="size-3.5" /> لینک (اختیاری)</span>
        <input
          className="fc-input text-start"
          dir="ltr"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="/app/events  یا  instagram.com/..."
          maxLength={300}
        />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          از
          <select className="fc-input" value={from} onChange={(e) => setFrom(e.target.value)}>
            {starts.map((d, i) => <option key={d} value={d}>{i === 0 ? "امروز" : i === 1 ? "فردا" : faDate(d)}</option>)}
          </select>
        </label>
        <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
          نمایش به مدت
          <select className="fc-input" value={length} onChange={(e) => setLength(Number(e.target.value))}>
            {LENGTHS.map((n) => <option key={n} value={n}>{n === 0 ? "تا وقتی حذفش کنم" : `${faDigits(n)} روز`}</option>)}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="size-4 accent-[var(--color-fc-cyan)]" />
        بالای صفحه‌ی اعضا ثابت بماند
      </label>
      <button type="submit" disabled={pending} className="fc-btn">
        {pending ? <Loader2 className="size-[18px] animate-spin" /> : <Megaphone className="size-[18px]" />}
        انتشار
      </button>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-center text-[12.5px] ${msg.ok ? "text-fc-ok" : "text-fc-bad"}`}>{msg.text}</p>}
    </form>
  );
}

export function DeleteAnnouncement({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(async () => { await deleteAnnouncement(id); })}
      aria-label="حذف اطلاعیه"
      className="grid size-9 shrink-0 place-items-center rounded-lg border border-[var(--fc-line2)] text-fc-muted hover:text-fc-bad"
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </button>
  );
}
