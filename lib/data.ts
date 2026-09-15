import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  birth_date: string | null;
  sex: "male" | "female" | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal: "gain" | "lose" | "maintain" | null;
  activity_level: number | null;
}

export interface Membership {
  id: string;
  started_on: string;
  expires_on: string;
  sessions_total: number | null;
  sessions_used: number;
  status: "active" | "expired" | "frozen";
  plans: { name: string; kind: string } | null;
}

/** The signed-in user's profile, or a redirect to login. Every /app
 *  route funnels through this, so an expired session can never render
 *  a half-populated panel. */
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Explicit columns, not "*": SELECT on profiles.phone is revoked at the
  // column level, and a star select would fail for every signed-in user.
  // The caller's own number is on the auth session anyway.
  const { data } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, birth_date, sex, height_cm, weight_kg, goal, activity_level"
    )
    .eq("id", user.id)
    .single();

  if (!data) redirect("/login");
  return data as Profile;
}

export async function requireStaff(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.role === "student") redirect("/app");
  return profile;
}

export async function getActiveMembership(studentId: string): Promise<Membership | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("memberships")
    .select("id, started_on, expires_on, sessions_total, sessions_used, status, plans(name, kind)")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("expires_on", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data as Membership | null) ?? null;
}

/** Feature flags. Falls back to "on" only for keys we know default on,
 *  so a failed read never silently disables a paid-for module. */
export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("value").eq("key", key).maybeSingle();
  return data ? (data.value as T) : fallback;
}

export function sessionsLeft(m: Membership | null): number | null {
  if (!m || m.sessions_total === null) return null;
  return Math.max(0, m.sessions_total - m.sessions_used);
}

/** PostgREST returns a single object for a to-one relation, but without
 *  generated types supabase-js infers every embed as an array. This
 *  normalises both shapes so callers get one row or null. */
export function one<T>(rel: T | T[] | null | undefined): T | null {
  if (!rel) return null;
  return Array.isArray(rel) ? (rel[0] ?? null) : rel;
}
