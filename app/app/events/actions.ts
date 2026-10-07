"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { eventErrorMessage } from "@/lib/events";

export interface EventResult {
  ok: boolean;
  message?: string;
}

/** Capacity, deadline and division are checked inside register_event(). */
export async function registerEvent(eventId: string, division: string | null): Promise<EventResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("register_event", { p_event: eventId, p_division: division });
  if (error) return { ok: false, message: eventErrorMessage(error.message) };
  revalidatePath("/app/events");
  revalidatePath("/app");
  return { ok: true };
}

export async function cancelEventRegistration(eventId: string): Promise<EventResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_event_registration", { p_event: eventId });
  if (error) return { ok: false, message: eventErrorMessage(error.message) };
  revalidatePath("/app/events");
  revalidatePath("/app");
  return { ok: true };
}
