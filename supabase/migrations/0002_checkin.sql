-- ============================================================
-- Fit Club — check-in / check-out
--
-- The door device (an Android tablet or USB NFC reader next to the
-- entrance) calls record_tap() with a card UID. This runs as the
-- service role, never as the student, so a student can never mint
-- their own check-in.
-- ============================================================

-- What the door device shows on its screen after a tap.
create type tap_result as enum (
  'entered',          -- welcome, a session was consumed
  'exited',           -- goodbye
  'entered_no_deduct',-- welcome, but nothing was consumed (unlimited plan, or a repeat tap)
  'no_membership',    -- card is valid but the student has no active membership
  'no_sessions',      -- membership is active but sessions ran out
  'expired',          -- membership date has passed
  'unknown_card',     -- UID is not in the system
  'module_off'        -- the owner switched the whole module off
);

-- ------------------------------------------------------------
-- decide_tap: the gym's own door policy.
--
-- Given the student's last tap and their membership, decide two things:
--   1. is this tap an entry or an exit?
--   2. does it consume a session?
--
-- This is deliberately a small, separate function because it encodes a
-- business rule that differs from gym to gym — see the note below.
--
-- @param p_last_kind    the student's previous tap today, or null if none
-- @param p_last_at      when that previous tap happened, or null
-- @param p_sessions_left remaining sessions, or null for an unlimited plan
-- @returns (kind, deduct) — the tap to record, and whether to bill a session
-- ------------------------------------------------------------
create or replace function public.decide_tap(
  p_last_kind      checkin_kind,
  p_last_at        timestamptz,
  p_sessions_left  int
)
returns table (kind checkin_kind, deduct boolean)
language plpgsql immutable as $$
begin
  -- TODO(owner): fill in the door policy for Fit Club.
  --
  -- Questions this function has to answer, and there is no universally
  -- right answer — it depends on how you run the gym:
  --
  --   * First tap of the day is obviously an entry. Is the second tap
  --     always an exit, or only after some minimum time inside?
  --   * Someone taps twice within 30 seconds because the reader
  --     beeped oddly. Do you charge them two sessions, or treat the
  --     second tap as a no-op?
  --   * Someone enters, leaves for lunch, comes back the same day.
  --     Second entry — new session, or already paid for today?
  --   * Someone forgets to tap out and taps "in" again tomorrow.
  --     Do you close yesterday silently?
  --
  -- Return one row: the kind of tap to record, and whether it should
  -- decrement sessions_used. An unlimited plan arrives here with
  -- p_sessions_left = null and must never deduct.
  --
  -- Example shape (replace with your rule):
  --   kind := 'in'; deduct := true; return next;

  raise exception 'decide_tap: door policy not configured yet';
end;
$$;

-- ------------------------------------------------------------
-- record_tap: the entry point the door device calls.
-- Resolves the card, checks the module flag and the membership, then
-- defers the actual in/out + billing decision to decide_tap above.
-- ------------------------------------------------------------
create or replace function public.record_tap(p_card_uid text)
returns table (
  result       tap_result,
  student_name text,
  sessions_left int,
  days_left    int
)
language plpgsql security definer set search_path = public as $$
declare
  v_enabled   boolean;
  v_card      public.cards%rowtype;
  v_profile   public.profiles%rowtype;
  v_mem       public.memberships%rowtype;
  v_left      int;
  v_last_kind checkin_kind;
  v_last_at   timestamptz;
  v_decision  record;
begin
  select (value)::boolean into v_enabled
    from public.settings where key = 'checkin_module_enabled';

  if not coalesce(v_enabled, false) then
    return query select 'module_off'::tap_result, null::text, null::int, null::int;
    return;
  end if;

  select * into v_card from public.cards
    where uid = p_card_uid and active limit 1;

  if not found then
    return query select 'unknown_card'::tap_result, null::text, null::int, null::int;
    return;
  end if;

  select * into v_profile from public.profiles where id = v_card.student_id;

  select * into v_mem from public.memberships
    where student_id = v_card.student_id and status = 'active'
    order by expires_on desc limit 1;

  if not found then
    return query select 'no_membership'::tap_result, v_profile.full_name, null::int, null::int;
    return;
  end if;

  if v_mem.expires_on < current_date then
    update public.memberships set status = 'expired' where id = v_mem.id;
    return query select 'expired'::tap_result, v_profile.full_name, null::int, 0;
    return;
  end if;

  v_left := public.sessions_left(v_mem);

  select kind, at into v_last_kind, v_last_at
    from public.checkins
    where student_id = v_card.student_id
    order by at desc limit 1;

  select * into v_decision from public.decide_tap(v_last_kind, v_last_at, v_left);

  if v_decision.deduct and v_left is not null and v_left <= 0 then
    return query select 'no_sessions'::tap_result, v_profile.full_name, 0,
                        (v_mem.expires_on - current_date);
    return;
  end if;

  insert into public.checkins (student_id, membership_id, card_id, kind, deducted)
  values (v_card.student_id, v_mem.id, v_card.id, v_decision.kind, v_decision.deduct);

  if v_decision.deduct then
    update public.memberships
      set sessions_used = sessions_used + 1
      where id = v_mem.id
      returning public.sessions_left(memberships.*) into v_left;
  end if;

  return query select
    case
      when v_decision.kind = 'out' then 'exited'::tap_result
      when v_decision.deduct       then 'entered'::tap_result
      else 'entered_no_deduct'::tap_result
    end,
    v_profile.full_name,
    v_left,
    (v_mem.expires_on - current_date);
end;
$$;

-- Only the service role (the door device) may call this.
revoke execute on function public.record_tap(text) from anon, authenticated;
