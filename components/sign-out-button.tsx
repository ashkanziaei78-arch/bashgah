"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    // replace, not push: the back button must not return to a signed-in screen
    router.replace("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      className="fc-btn fc-btn-ghost w-full border-fc-bad/30 text-fc-bad hover:border-fc-bad hover:text-fc-bad"
    >
      {busy ? (
        <>
          <Loader2 className="size-[18px] animate-spin" />
          در حال خروج…
        </>
      ) : (
        <>
          <LogOut className="size-[18px]" />
          خروج از حساب
        </>
      )}
    </button>
  );
}
