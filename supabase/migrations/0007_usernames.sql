-- ============================================================
-- Username sign-in
--
-- Members sign in with a username and password. Supabase authenticates
-- against an email or a phone, never a free-form username, so each
-- username maps to a deterministic internal address:
--
--     <username>@fitclub.invalid
--
-- The client derives that address locally, so there is no lookup
-- endpoint a stranger could use to test which usernames exist.
--
-- .invalid is reserved by RFC 2606 precisely for addresses that must
-- never resolve, so no mail can reach one by accident. Members never see
-- it. The phone number stays on the same account for sign-up and, once
-- sms.ir is connected, SMS codes — one person, one account, either way in.
-- ============================================================

alter table public.profiles add column username text unique;

alter table public.profiles add constraint username_format
  check (username is null or username ~ '^[a-z0-9_]{3,32}$');

comment on column public.profiles.username is
  'Sign-in name. Lowercase latin, digits and underscore. Maps to <username>@fitclub.invalid in auth.users.';

update public.profiles set username = 'amir'  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set username = 'ali'   where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set username = 'admin' where id = '33333333-3333-3333-3333-333333333333';

-- Point the auth email at the derived address. The identity row carries
-- its own copy, so it has to move with it or sign-in stops resolving.
update auth.users u
set email = p.username || '@fitclub.invalid'
from public.profiles p
where p.id = u.id and p.username is not null;

update auth.identities i
set provider_id = p.username || '@fitclub.invalid',
    identity_data = jsonb_build_object(
      'sub', i.user_id::text,
      'email', p.username || '@fitclub.invalid',
      'email_verified', true
    ),
    updated_at = now()
from public.profiles p
where p.id = i.user_id
  and i.provider = 'email'
  and p.username is not null;
