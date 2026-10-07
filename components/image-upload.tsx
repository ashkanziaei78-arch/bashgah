"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { publicUrl, type MediaBucket } from "@/lib/storage";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/** Per-bucket ceilings, matching the limits set in migration 0008. The
 *  check here only buys a readable message — Storage enforces the real
 *  one and would otherwise reject with a raw error. */
const MAX_MB: Record<MediaBucket, number> = {
  "program-covers": 5,
  "exercise-thumbs": 3,
  avatars: 2,
  "gym-media": 6,
};

/** One photo slot.
 *
 *  Uploads straight from the browser to a public bucket, so a multi-
 *  megabyte file never travels through a server action. Storage RLS is
 *  what authorises the write; this component only reports the outcome.
 *
 *  The upload runs on choose rather than on save, so whoever is
 *  uploading sees the actual crop before committing the record. A file
 *  orphaned by a change of mind is the trade, and that is much cheaper
 *  than a saved record pointing at a photo that never uploaded.
 */
export function ImageUpload({
  bucket,
  value,
  onChange,
  label,
  hint,
  /** Tailwind aspect class — match it to where the photo is shown. */
  aspect = "aspect-[16/9]",
  rounded = "rounded-2xl",
  /** Folder to nest the file under; avatars use the owner's id. */
  folder,
}: {
  bucket: MediaBucket;
  value: string | null;
  onChange: (path: string | null) => void;
  label: string;
  hint?: string;
  aspect?: string;
  rounded?: string;
  folder?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const url = publicUrl(bucket, value);

  async function upload(file: File) {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("فقط عکس JPG، PNG، WebP یا AVIF.");
      return;
    }
    if (file.size > MAX_MB[bucket] * 1024 * 1024) {
      setError(`حجم عکس باید زیر ${MAX_MB[bucket]} مگابایت باشد.`);
      return;
    }

    setBusy(true);
    const supabase = createClient();
    // Random name: two people uploading "photo.jpg" in the same minute
    // must not overwrite one another.
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const name = `${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${ext}`;

    const { error: err } = await supabase.storage
      .from(bucket)
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
      <span className="mb-1.5 block text-[12.5px] text-fc-muted">{label}</span>

      <div
        className={`fc-dark relative w-full overflow-hidden border border-[var(--fc-line2)] ${aspect} ${rounded}`}
      >
        {url ? (
          <Image src={url} alt="" fill sizes="560px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 bg-fc-ink" />
        )}
        <span className="fc-cover-scrim" />

        <div className="relative flex h-full items-center justify-center gap-2 p-3">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="fc-btn"
            style={{ minHeight: 40, padding: "9px 16px", fontSize: 13 }}
          >
            {busy ? (
              <Loader2 className="size-[18px] animate-spin" />
            ) : (
              <ImagePlus className="size-[18px]" />
            )}
            {value ? "تعویض" : "انتخاب عکس"}
          </button>

          {value && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onChange(null)}
              aria-label={`حذف ${label}`}
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

      {hint && <p className="mt-1.5 text-[11.5px] leading-relaxed text-fc-muted">{hint}</p>}

      {error && (
        <p role="alert" className="mt-1.5 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
    </div>
  );
}
