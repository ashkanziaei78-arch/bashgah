"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { setTheme } from "@/app/admin/actions";
import { THEMES, type ThemeId } from "@/lib/themes";

/** Repaints the page in a theme before the server has confirmed it. */
function previewTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
}

/** One card per theme, drawn in that theme's own colours so the owner
 *  sees the result before choosing it. Applies on tap. */
export function ThemePicker({ current }: { current: ThemeId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ThemeId>(current);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(id: ThemeId) {
    if (id === selected || pending) return;
    const previous = selected;
    setSelected(id);
    setError(null);
    // Preview at once; the server render that follows confirms it.
    previewTheme(id);
    start(async () => {
      const res = await setTheme(id);
      if (!res.ok) {
        setSelected(previous);
        previewTheme(previous);
        setError(res.message ?? "تم ذخیره نشد.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <ul className="grid list-none gap-3 p-0 sm:grid-cols-2" role="radiogroup" aria-label="تم رنگی باشگاه">
        {THEMES.map((t) => {
          const [ground, card, primary, accent] = t.swatch;
          const on = selected === t.id;
          return (
            <li key={t.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(t.id)}
                className={`fc-card w-full overflow-hidden p-0 text-start ${on ? "border-fc-cyan" : ""}`}
                style={on ? { boxShadow: "0 0 0 2px var(--color-fc-cyan)" } : undefined}
              >
                {/* A miniature screen in the theme's own colours */}
                <div className="flex h-24 items-end gap-2 p-3" style={{ background: ground }}>
                  <div className="h-full flex-1 rounded-lg p-2" style={{ background: card }}>
                    <div className="mb-1.5 h-2 w-3/5 rounded-full" style={{ background: primary }} />
                    <div className="h-1.5 w-4/5 rounded-full opacity-40" style={{ background: primary }} />
                    <div className="mt-3 h-4 w-1/2 rounded-md" style={{ background: primary }} />
                  </div>
                  <div className="h-10 w-10 rounded-lg" style={{ background: accent }} />
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13.5px]">{t.name}</b>
                    <small className="text-[11.5px] text-fc-muted">{t.description}</small>
                  </div>
                  {on &&
                    (pending ? (
                      <Loader2 className="size-[18px] shrink-0 animate-spin text-fc-cyan" />
                    ) : (
                      <Check className="size-[18px] shrink-0 text-fc-cyan" />
                    ))}
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-3 text-[12.5px] text-fc-bad">
          {error}
        </p>
      )}
    </div>
  );
}
