"use client";

import { useState } from "react";
import { Plus, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Files a request with the coaching staff. The coach picks it up in
 *  their queue and books the in-person slot — the app never auto-assigns
 *  a time, because the slot depends on who is on the floor that day. */
export function RequestButton({
  kind,
  label,
  variant = "solid",
}: {
  kind: "workout" | "diet";
  label: string;
  variant?: "solid" | "ghost";
}) {
  const [state, setState] = useState<"idle" | "busy" | "sent" | "error">("idle");

  async function submit() {
    setState("busy");
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setState("error");
      return;
    }

    const { error } = await supabase.from("requests").insert({
      student_id: user.id,
      kind,
      status: "pending",
    });
    setState(error ? "error" : "sent");
  }

  if (state === "sent") {
    return (
      <p className="fc-card flex items-center justify-center gap-2 p-3.5 text-[13px] text-fc-ok">
        <Check className="size-[18px]" />
        درخواست ثبت شد. مربی تایم را برایتان می‌گذارد.
      </p>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={submit}
        disabled={state === "busy"}
        className={variant === "ghost" ? "fc-btn fc-btn-ghost w-full" : "fc-btn w-full"}
      >
        {state === "busy" ? (
          <>
            <Loader2 className="size-[18px] animate-spin" />
            در حال ارسال…
          </>
        ) : (
          <>
            <Plus className="size-[18px]" />
            {label}
          </>
        )}
      </button>
      {state === "error" && (
        <p role="alert" className="mt-2 text-center text-[12.5px] text-fc-bad">
          ثبت نشد. اینترنت را بررسی کنید و دوباره بزنید.
        </p>
      )}
    </>
  );
}
