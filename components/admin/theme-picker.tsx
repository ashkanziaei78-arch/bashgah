"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Moon, Sun } from "lucide-react";
import { setTheme } from "@/app/admin/actions";
import { FAMILIES, familyOf, type FamilyId } from "@/lib/themes";
import { applyTheme } from "@/components/theme-dom";

function Mini({ swatch }: { swatch: [string, string, string, string] }) {
  const [ground, card, primary, accent] = swatch;
  return (
    <div className="flex h-20 flex-1 items-end gap-1.5 p-2.5" style={{ background: ground }}>
      <div className="h-full flex-1 rounded-md p-1.5" style={{ background: card }}>
        <div className="mb-1 h-1.5 w-3/5 rounded-full" style={{ background: primary }} />
        <div className="h-1 w-4/5 rounded-full opacity-40" style={{ background: primary }} />
        <div className="mt-2.5 h-3 w-1/2 rounded" style={{ background: primary }} />
      </div>
      <div className="size-7 rounded-md" style={{ background: accent }} />
    </div>
  );
}

/** One card per colour family, each showing its day and night version
 *  in the family's own colours. Applies on tap. */
export function ThemePicker({ current }: { current: FamilyId }) {
  const router = useRouter();
  const [selected, setSelected] = useState<FamilyId>(current);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function choose(id: FamilyId) {
    if (id === selected || pending) return;
    const previous = selected;
    setSelected(id);
    setError(null);
    applyTheme({ family: familyOf(id) });
    start(async () => {
      const res = await setTheme(id);
      if (!res.ok) {
        setSelected(previous);
        applyTheme({ family: familyOf(previous) });
        setError(res.message ?? "تم ذخیره نشد.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <ul className="grid list-none gap-3 p-0" role="radiogroup" aria-label="تم رنگی باشگاه">
        {FAMILIES.map((f) => {
          const on = selected === f.id;
          return (
            <li key={f.id}>
              <button
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => choose(f.id)}
                className={`fc-card w-full overflow-hidden p-0 text-start ${on ? "border-fc-cyan" : ""}`}
                style={on ? { boxShadow: "0 0 0 2px var(--color-fc-cyan)" } : undefined}
              >
                <div className="flex">
                  <Mini swatch={f.daySwatch} />
                  <Mini swatch={f.nightSwatch} />
                </div>
                <div className="flex items-center gap-2.5 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <b className="block text-[13.5px]">{f.name}</b>
                    <small className="text-[11.5px] text-fc-muted">{f.description}</small>
                  </div>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-fc-dim">
                    <Sun className="size-3.5" />
                    <Moon className="size-3.5" />
                  </span>
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
