"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** `compact` is the small header version: an icon and one word, for the
 *  top of a panel where a full-width button would shout. */
export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function signOut() {
    setBusy(true);
    await createClient().auth.signOut();
    // replace, not push: the back button must not land on a panel that
    // now has no session behind it.
    router.replace("/login");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--fc-line2)] px-3 py-1.5 text-[12px] font-bold text-fc-muted transition-colors hover:text-fc-bad"
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
        خروج
      </button>
    );
  }

  return (
    <button type="button" onClick={signOut} disabled={busy} className="fc-btn fc-btn-ghost w-full">
      {busy ? <Loader2 className="size-[18px] animate-spin" /> : <LogOut className="size-[18px]" />}
      خروج از حساب
    </button>
  );
}
