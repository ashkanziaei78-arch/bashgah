-- ============================================================
-- Fit Club — function hardening
--
-- Raised by the Supabase database linter after 0001/0002:
--   0011 function_search_path_mutable
--   0028 anon_security_definer_function_executable
--   0029 authenticated_security_definer_function_executable
-- ============================================================

-- 1. Pin search_path so a caller cannot shadow `public` with a schema of
--    their own and have a SECURITY DEFINER function resolve to their code.
create or replace function public.sessions_left(m public.memberships)
returns int language sql stable set search_path = public as $$
  select case
    when m.sessions_total is null then null
    else greatest(0, m.sessions_total - m.sessions_used)
  end;
$$;

create or replace function public.decide_tap(
  p_last_kind      checkin_kind,
  p_last_at        timestamptz,
  p_sessions_left  int
)
returns table (kind checkin_kind, deduct boolean)
language plpgsql immutable set search_path = public as $$
begin
  -- TODO(owner): the gym's door policy still goes here.
  raise exception 'decide_tap: door policy not configured yet';
end;
$$;

-- 2. PostgREST turns every executable function in `public` into an RPC
--    endpoint. Revoking from PUBLIC is what actually removes the grant —
--    revoking from anon/authenticated alone leaves the PUBLIC default,
--    which is why the first attempt in 0002 did not clear the warning.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.record_tap(text) from public, anon, authenticated;
revoke execute on function public.decide_tap(checkin_kind, timestamptz, int)
  from public, anon, authenticated;

-- 3. The fc_* helpers are called from inside RLS policy expressions.
--    Postgres evaluates those as the querying role, so `authenticated`
--    must keep EXECUTE or every policy referencing them fails. The linter
--    still flags these three; that is expected. All they return is the
--    caller's own role, which the caller can already read from their own
--    profile row, so the exposure adds nothing.
revoke execute on function public.fc_role()      from public, anon;
revoke execute on function public.fc_is_staff()  from public, anon;
revoke execute on function public.fc_is_admin()  from public, anon;
revoke execute on function public.sessions_left(public.memberships) from public, anon;

grant execute on function public.fc_role()      to authenticated;
grant execute on function public.fc_is_staff()  to authenticated;
grant execute on function public.fc_is_admin()  to authenticated;
grant execute on function public.sessions_left(public.memberships) to authenticated;
