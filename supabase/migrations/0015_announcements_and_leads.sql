-- ============================================================
-- Fit Club — telling members things, and not losing the people who
-- asked about joining
--
-- ANNOUNCEMENTS. "The gym is closed on the 13th", "new spin class on
-- Tuesdays", "20% off a three-month renewal this week" went out as a
-- sheet of A4 on the door and a forwarded message nobody scrolled back
-- to. They now go on the member's home screen, for exactly the dates
-- they apply to.
--
-- LEADS. Somebody walks in, asks the price, leaves a number on a
-- post-it. Whether anyone ever calls them back depends on the post-it.
-- A lead is that post-it with a status and a follow-up date, so the
-- desk can see who is waiting for a call today and the owner can see
-- how many enquiries turn into members.
-- ============================================================

create type announcement_tone as enum ('info', 'offer', 'alert');

create table public.announcements (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  body          text,
  tone          announcement_tone not null default 'info',
  pinned        boolean not null default false,
  publish_from  date not null default (now() at time zone 'Asia/Tehran')::date,
  publish_until date,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),

  constraint title_sane  check (char_length(btrim(title)) between 2 and 80),
  constraint body_sane   check (body is null or char_length(body) <= 600),
  constraint window_sane check (publish_until is null or publish_until >= publish_from)
);

create index announcements_window on public.announcements (publish_from, publish_until);

alter table public.announcements enable row level security;

-- Members see what is live today; staff see everything, including what
-- is scheduled and what has ended, so they can edit it.
create policy announcements_read on public.announcements for select
  using (
    public.fc_is_staff()
    or (
      auth.uid() is not null
      and publish_from <= (now() at time zone 'Asia/Tehran')::date
      and (publish_until is null or publish_until >= (now() at time zone 'Asia/Tehran')::date)
    )
  );

create policy announcements_admin on public.announcements for all
  using (public.fc_is_admin()) with check (public.fc_is_admin());

revoke all on public.announcements from anon;
grant select, insert, update, delete on public.announcements to authenticated;

-- ------------------------------------------------------------

create type lead_status as enum ('new', 'contacted', 'trial', 'won', 'lost');
create type lead_source as enum ('walk_in', 'phone', 'instagram', 'referral', 'website', 'other');

comment on type lead_status is
  'new = just asked; contacted = called back; trial = came for a trial session; won = became a member; lost = not interested.';

create table public.leads (
  id            uuid primary key default gen_random_uuid(),
  full_name     text not null,
  phone         text,
  source        lead_source not null default 'walk_in',
  interest      text,
  status        lead_status not null default 'new',
  note          text,
  follow_up_on  date,
  -- Set when the lead became a member, so the conversion is traceable
  -- from the enquiry to the account.
  member_id     uuid references public.profiles (id) on delete set null,
  created_by    uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  constraint name_sane     check (char_length(btrim(full_name)) between 2 and 80),
  -- Stored as typed, digits only, so the same number entered twice is
  -- recognisable as the same person.
  constraint phone_digits  check (phone is null or phone ~ '^[0-9+]{7,15}$'),
  constraint note_short    check (note is null or char_length(note) <= 1000),
  constraint interest_short check (interest is null or char_length(interest) <= 120)
);

create index leads_status on public.leads (status, follow_up_on);
create index leads_created on public.leads (created_at desc);

create or replace function public.leads_touch()
returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger leads_updated
  before update on public.leads
  for each row execute function public.leads_touch();

alter table public.leads enable row level security;

-- Prospects' phone numbers are staff business only.
create policy leads_staff on public.leads for all
  using (public.fc_is_staff()) with check (public.fc_is_staff());

revoke all on public.leads from anon;
grant select, insert, update, delete on public.leads to authenticated;
revoke execute on function public.leads_touch() from public, anon, authenticated;
