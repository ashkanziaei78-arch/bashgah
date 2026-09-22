"use client";

import { useState } from "react";
import { Play, VideoOff } from "lucide-react";

/** The exercise demonstration, or an honest explanation of why there
 *  isn't one.
 *
 *  Short, silent, looping — the way every form clip works. It carries
 *  `controls` anyway, because "let me see that bit again" is the whole
 *  reason someone opened it mid-set. */
export function ExerciseVideo({
  src,
  poster,
  name,
}: {
  src: string | null;
  poster: string | null;
  name: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className="fc-video-empty">
        {failed ? (
          <VideoOff className="size-8 opacity-60" aria-hidden />
        ) : (
          <Play className="size-8 opacity-60" aria-hidden />
        )}
        <p className="text-sm">
          {failed
            ? "ویدیو باز نشد. اتصالت را بررسی کن."
            : "ادمین هنوز ویدیویی برای این حرکت ثبت نکرده"}
        </p>
      </div>
    );
  }

  return (
    // A silent form demo has no speech to caption; the written
    // instructions beneath it carry the same information.
    <video
      className="fc-video"
      src={src}
      poster={poster ?? undefined}
      controls
      loop
      muted
      playsInline
      preload="metadata"
      aria-label={`ویدیوی اجرای ${name}`}
      onError={() => setFailed(true)}
    />
  );
}
