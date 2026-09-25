"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { CoverArt } from "@/components/cover-art";
import { createClient } from "@/lib/supabase/client";
import { programCoverUrl } from "@/lib/storage";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Picks the cover photo for a programme.
 *
 *  Uploads straight from the browser to the public `program-covers`
 *  bucket — the file never passes through a server action, which keeps a
 *  5MB photo out of the request body. Storage RLS is what authorises it:
 *  only staff may write to the bucket.
 *
 *  The upload happens on choose, not on save, so the coach sees the
 *  actual crop before committing the programme. An orphaned file is the
 *  cost when they change their mind — cheaper than a half-saved
 *  programme, and the bucket is admin-clearable.
 */
export function CoverPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const url = programCoverUrl(value);

  async function upload(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("فقط عکس JPG، PNG، WebP یا AVIF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("حجم عکس باید زیر ۵ مگابایت باشد.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    // Random name: two coaches uploading "cover.jpg" in the same minute
    // must not overwrite one another.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const name = `${crypto.randomUUID()}.${ext}`;

    const { error: err } = await supabase.storage
      .from("program-covers")
      .upload(name, file, { cacheControl: "31536000", upsert: false });

    setBusy(false);
    if (err) {
      setError("بارگذاری نشد. دوباره تلاش کنید.");
      return;
    }
    onChange(name);
  }

  return (
    <div>
      <span className="mb-1.5 block text-[12.5px] text-fc-muted">عکس برنامه</span>

      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[var(--fc-line2)]">
        {url ? (
          <Image src={url} alt="" fill sizes="560px" className="object-cover" />
        ) : (
          <CoverArt seed="cover" />
        )}
        <span className="fc-cover-scrim" />

        <div className="relative flex h-full items-center justify-center gap-2 p-4">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="fc-btn"
            style={{ minHeight: 42, padding: "10px 18px", fontSize: 13 }}
          >
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <ImagePlus className="size-[18px]" />
            )}
            {value ? "تعویض عکس" : "انتخاب عکس"}
          </button>

          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(null)}
              aria-label="حذف عکس"
              className="grid size-10 place-items-center rounded-xl border border-[rgba(255,255,255,.18)] bg-[rgba(255,255,255,.08)] text-fc-text backdrop-blur-md transition-colors hover:text-fc-bad"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPTED.join(",")}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void upload(file);
          e.target.value = ""; // let the same file be re-picked after a delete
        }}
      />

      <p className="mt-1.5 text-[11.5px] leading-relaxed text-fc-muted">
        عکس افقی و تیره بهتر می‌نشیند. اگر عکسی نگذارید، یک طرح گرادیانی
        اختصاصی همان برنامه نشان داده می‌شود.
      </p>

      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
    </div>
  );
}
