-- ============================================================
-- Fit Club — let a student see who wrote their programme
--
-- The problem: `profiles` RLS says you see your own row unless you are
-- staff. A student embedding coach:coach_id(full_name) therefore gets
-- null back — the join silently returns nothing rather than erroring,
-- so the page just shows no coach name.
--
-- The tempting fix is a policy opening staff rows to every member. That
-- works, but RLS filters rows, not columns, so it would hand every
-- member the phone number of every coach.
--
-- So the two halves are solved separately:
--   rows    → a policy exposing only coach/admin rows to signed-in users
--   columns → a column-level revoke that removes phone from the table
--             for everyone but the service role
--
-- Dropping read access to profiles.phone costs nothing: a user's own
-- number is already on the auth session via getUser(), and this column
-- is only a convenience copy of auth.users.phone.
-- ============================================================

create view public.coach_directory
  with (security_invoker = true) as
  select id, full_name, role
  from public.profiles
  where role in ('coach', 'admin');

create policy profiles_read_staff on public.profiles for select
  using (auth.uid() is not null and role in ('coach', 'admin'));

revoke select (phone) on public.profiles from anon, authenticated;

revoke all on public.coach_directory from anon;
grant select on public.coach_directory to authenticated;

-- Note for callers: because the phone column is revoked, `select *` on
-- profiles now fails for signed-in users. Name the columns you need —
-- see requireProfile() in lib/data.ts.
