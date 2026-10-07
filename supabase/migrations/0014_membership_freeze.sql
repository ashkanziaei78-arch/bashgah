-- ============================================================
-- Fit Club — a freeze that gives the days back
--
-- The membership panel already had a "freeze" switch, but all it did
-- was flip status to 'frozen'. The expiry date kept running underneath,
-- so a member who froze for a three-week trip came back to a
-- subscription that had quietly lost three weeks — which is the
-- opposite of what the desk promised them, and exactly the conversation
-- that ends with somebody not renewing.
--
-- Now a freeze is a dated record. Thawing it adds the frozen days to
-- the expiry date, up to a ceiling the owner sets, and every freeze a
-- membership has had stays on file.
-- ============================================================

create table public.membership_freezes (
  id             uuid primary key default gen_random_uuid(),
  membership_id  uuid not null references public.memberships (id) on delete cascade,
  student_id     uuid not null references public.profiles (id) on delete cascade,
  started_on     date not null,
  ended_on       date,
  -- What was actually added back on thaw. Can be less than the days
  -- frozen when the ceiling was reached.
  days_credited  int,
  reason         text,
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now(),

  constraint freeze_dates check (ended_on is null or ended_on >= started_on),
  constraint reason_short check (reason is null or char_length(reason) <= 200)
);

-- At most one open freeze per subscription.
create unique index membership_freezes_open
  on public.membership_freezes (membership_id) where ended_on is null;
create index membership_freezes_member on public.membership_freezes (student_id, started_on desc);

insert into public.settings (key, value) values
  ('freeze_max_days', '60'::jsonb)
on conflict (key) do nothing;

-- Today on the gym's calendar, not the server's.
create or replace function public.fc_today()
returns date
language sql stable set search_path = public as $$
  select (now() at time zone 'Asia/Tehran')::date;
$$;

create or replace function public.freeze_membership(p_membership uuid, p_reason text default null)
returns void
language plpgsql security definer set search_path = public as $$
declare
  v_m public.memberships;
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;

  select * into v_m from public.memberships where id = p_membership for update;
  if not found then
    raise exception 'membership_not_found';
  end if;
  if v_m.status = 'frozen' then
    raise exception 'already_frozen';
  end if;
  if v_m.status <> 'active' or v_m.expires_on < public.fc_today() then
    raise exception 'not_active';
  end if;

  update public.memberships set status = 'frozen' where id = p_membership;

  insert into public.membership_freezes (membership_id, student_id, started_on, reason, created_by)
  values (p_membership, v_m.student_id, public.fc_today(), nullif(btrim(p_reason), ''), auth.uid());
end;
$$;

-- Returns the new expiry date. Frozen days are counted from the day the
-- freeze began up to, not including, today — a member frozen on Monday
-- and thawed on Wednesday was away for two days.
create or replace function public.thaw_membership(p_membership uuid)
returns date
language plpgsql security definer set search_path = public as $$
declare
  v_m       public.memberships;
  v_f       public.membership_freezes;
  v_used    int;
  v_days    int;
  v_credit  int;
  v_expires date;
begin
  if not public.fc_is_staff() then
    raise exception 'staff_only';
  end if;

  select * into v_m from public.memberships where id = p_membership for update;
  if not found then
    raise exception 'membership_not_found';
  end if;
  if v_m.status <> 'frozen' then
    raise exception 'not_frozen';
  end if;

  select * into v_f from public.membership_freezes
   where membership_id = p_membership and ended_on is null
   for update;

  -- Frozen by the old switch, before this table existed: nothing to
  -- credit, so just resume it.
  if not found then
    update public.memberships set status = 'active' where id = p_membership;
    return v_m.expires_on;
  end if;

  select coalesce(sum(days_credited), 0) into v_used
    from public.membership_freezes
   where membership_id = p_membership and ended_on is not null;

  v_days   := greatest(0, public.fc_today() - v_f.started_on);
  v_credit := least(v_days, greatest(0, public.fc_setting_int('freeze_max_days', 60) - v_used));
  v_expires := v_m.expires_on + v_credit;

  update public.membership_freezes
     set ended_on = public.fc_today(), days_credited = v_credit
   where id = v_f.id;

  update public.memberships
     set expires_on = v_expires,
         status = case when v_expires >= public.fc_today() then 'active' else 'expired' end::member_status
   where id = p_membership;

  return v_expires;
end;
$$;

alter table public.membership_freezes enable row level security;

create policy membership_freezes_read on public.membership_freezes for select
  using (student_id = auth.uid() or public.fc_is_staff());

revoke all on public.membership_freezes from anon;
grant select on public.membership_freezes to authenticated;
revoke insert, update, delete, truncate on public.membership_freezes from authenticated;

revoke execute on function public.fc_today() from public, anon;
grant execute on function public.fc_today() to authenticated;
revoke execute on function public.freeze_membership(uuid, text) from public, anon;
revoke execute on function public.thaw_membership(uuid) from public, anon;
grant execute on function public.freeze_membership(uuid, text) to authenticated;
grant execute on function public.thaw_membership(uuid) to authenticated;
