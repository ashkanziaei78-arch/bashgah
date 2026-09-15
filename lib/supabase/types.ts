/** Placeholder until the project is provisioned.
 *
 * Regenerate against the real database with:
 *   npx supabase gen types typescript --project-id <ref> > lib/supabase/types.ts
 *
 * Until then this keeps the clients typed loosely rather than blocking
 * the build on types that do not exist yet.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "student" | "coach" | "admin";
export type PlanKind = "basic" | "pro" | "vip";
export type RequestKind = "workout" | "diet";
export type RequestStatus = "pending" | "scheduled" | "done" | "cancelled";
export type CheckinKind = "in" | "out";
export type ProgramStatus = "draft" | "published" | "archived";
export type MemberStatus = "active" | "expired" | "frozen";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
