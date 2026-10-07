"use client";

import { useState } from "react";
import { WandSparkles, ChevronDown } from "lucide-react";
import {
  suggestProgram, GOAL_LABEL, SPLIT_LABEL, LEVEL_LABEL, REGION_LABEL,
  type SuggestGoal, type SuggestSplit, type SuggestLevel, type LibraryExercise, type SuggestedItem,
} from "@/lib/program-suggest";
import { faDigits } from "@/lib/format";

/** "Build me the obvious version" for a coach in a hurry. The result
 *  lands in the editor as an ordinary draft; nothing is saved until the
 *  coach saves it. */
export function ProgramSuggest({
  library,
  seed,
  hasItems,
  onApply,
}: {
  library: LibraryExercise[];
  seed: string;
  hasItems: boolean;
  onApply: (items: SuggestedItem[], title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<SuggestGoal>("gain");
  const [split, setSplit] = useState<SuggestSplit>("full");
  const [level, setLevel] = useState<SuggestLevel>("beginner");
  const [note, setNote] = useState<string | null>(null);

  function build() {
    const r = suggestProgram(library, { goal, split, level, seed });
    if (r.items.length === 0) {
      setNote("کتابخانه‌ی حرکات برای این ترکیب حرکتی ندارد. از بخش حرکات، حرکت اضافه کنید.");
      return;
    }
    onApply(r.items, r.title);
    setNote(
      r.missing.length
        ? `${faDigits(r.items.length)} حرکت گذاشته شد. برای ${r.missing.map((m) => REGION_LABEL[m]).join("، ")} حرکت کافی در کتابخانه نبود.`
        : `${faDigits(r.items.length)} حرکت گذاشته شد. هر چیزی را که لازم است تغییر دهید و ذخیره کنید.`
    );
    setOpen(false);
  }

  return (
    <div className="fc-card mt-3.5 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-start"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-fc-cyan/12 text-fc-cyan">
          <WandSparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <b className="block text-[14px]">پیشنهاد خودکار برنامه</b>
          <small className="text-[11.5px] text-fc-muted">از حرکت‌های همین باشگاه، بر اساس هدف و سطح</small>
        </span>
        <ChevronDown className={`size-5 text-fc-dim transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="grid gap-3 border-t border-[var(--fc-line)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
              هدف
              <select className="fc-input" value={goal} onChange={(e) => setGoal(e.target.value as SuggestGoal)}>
                {(Object.keys(GOAL_LABEL) as SuggestGoal[]).map((g) => <option key={g} value={g}>{GOAL_LABEL[g]}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
              روز تمرین
              <select className="fc-input" value={split} onChange={(e) => setSplit(e.target.value as SuggestSplit)}>
                {(Object.keys(SPLIT_LABEL) as SuggestSplit[]).map((s) => <option key={s} value={s}>{SPLIT_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="grid gap-1.5 text-[12.5px] text-fc-muted">
              سطح
              <select className="fc-input" value={level} onChange={(e) => setLevel(e.target.value as SuggestLevel)}>
                {(Object.keys(LEVEL_LABEL) as SuggestLevel[]).map((l) => <option key={l} value={l}>{LEVEL_LABEL[l]}</option>)}
              </select>
            </label>
          </div>
          <button type="button" onClick={build} className="fc-btn">
            <WandSparkles className="size-[18px]" />
            {hasItems ? "ساختن و جایگزینی حرکات فعلی" : "ساختن پیش‌نویس"}
          </button>
        </div>
      )}
      {note && <p role="status" className="border-t border-[var(--fc-line)] px-4 py-3 text-[12.5px] text-fc-muted">{note}</p>}
    </div>
  );
}
