"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data";
import { classErrorMessage, type BookingStatus } from "@/lib/classes";

export interface ClassActionResult {
  ok: boolean;
  status?: BookingStatus;
  message?: string;
}

/** Seat or queue. The seat count, the subscription check and the
 *  waitlist all happen inside book_class(), under a row lock — the app
 *  only reports what the database decided. */
export async function bookClass(sessionId: string): Promise<ClassActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("book_class", { p_session: sessionId });
  if (error) return { ok: false, message: classErrorMessage(error.message) };
  revalidatePath("/app/classes");
  revalidatePath("/app");
  return { ok: true, status: data as BookingStatus };
}

export async function cancelBooking(sessionId: string): Promise<ClassActionResult> {
  await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_booking", { p_session: sessionId });
  if (error) return { ok: false, message: classErrorMessage(error.message) };
  revalidatePath("/app/classes");
  revalidatePath("/app");
  return { ok: true, status: "cancelled" };
}
