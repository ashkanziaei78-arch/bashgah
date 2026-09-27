"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SignOutButton() {
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

  return (
    <button type="button" onClick={signOut} disabled={busy} className="fc-btn fc-btn-ghost w-full">
      {busy ? <Loader2 className="size-[18px] animate-spin" /> : <LogOut className="size-[18px]" />}
      خروج از حساب
    </button>
  );
}
