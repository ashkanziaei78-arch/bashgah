"use client";

import { useState } from "react";
import { Moon, Sun, SunMoon } from "lucide-react";
import type { Mode } from "@/lib/themes";
import { applyTheme, rememberMode } from "@/components/theme-dom";

const OPTIONS: { mode: Mode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "روز", icon: Sun },
  { mode: "dark", label: "شب", icon: Moon },
  { mode: "auto", label: "خودکار", icon: SunMoon },
];

/** Day, night, or follow the phone. Personal: it lives in a cookie on
 *  this device, not in the gym's settings. */
export function ModeSwitch({ initial }: { initial: Mode }) {
  const [mode, setMode] = useState<Mode>(initial);

  function choose(m: Mode) {
    setMode(m);
    rememberMode(m);
    applyTheme({ mode: m });
  }

  return (
    <div className="fc-card flex items-center gap-3 p-3.5">
      <span className="flex-1 text-[13.5px] font-bold">حالت نمایش</span>
      <div role="radiogroup" aria-label="حالت نمایش" className="flex gap-1 rounded-xl border border-[var(--fc-line2)] p-1">
        {OPTIONS.map(({ mode: m, label, icon: Icon }) => (
          <button
            key={m}
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => choose(m)}
            className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[12px] font-bold transition-colors ${
              mode === m ? "bg-fc-cyan text-[var(--fc-on-accent)]" : "text-fc-muted hover:text-fc-text"
            }`}
          >
            <Icon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
