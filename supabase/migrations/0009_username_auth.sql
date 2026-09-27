-- ============================================================
-- Fit Club — sign in with a username, and let the gym mint accounts
--
-- Replaces the mobile number as the credential. The number was chosen
-- because everyone has one and nobody forgets it, but it dragged in an
-- SMS provider, a Send-SMS hook and a phone identity per account. The
-- gym would rather hand someone a username at the desk.
--
-- Supabase Auth has no username grant type, so the username is mapped to
-- a deterministic internal address: `ali` signs in as
-- `ali@fitclub.invalid`. The domain is reserved and unroutable on purpose
-- — nothing is ever delivered to it, and it cannot collide with a real
-- mailbox somebody also uses elsewhere.
--
-- The client derives that address itself, so signing in stays a single
-- signInWithPassword call with no lookup round trip and no RPC that
-- would let a stranger test whether a username exists.
-- ============================================================

alter table public.profiles
  add column if not exists username text;

-- Case-insensitive and unique: "Ali" and "ali" are one person, and the
-- address is built from the lowercase form.
create unique index if not exists profiles_username_key
  on public.profiles (lower(username));

-- Lowercase, digits and underscore. One separator, so a username read
-- aloud at the desk cannot be mistyped as a dot instead of a dash.
alter table public.profiles
  drop constraint if exists username_format;
alter table public.profiles
  add constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,32}$'
  );

comment on column public.profiles.username is
  'Sign-in name. The account''s auth address is lower(username) || ''@fitclub.invalid''.';

-- Existing accounts keep working: their addresses already carry the name
-- the gym knows them by.
update public.profiles p
   set username = split_part(u.email, '@', 1)
  from auth.users u
 where u.id = p.id
   and p.username is null
   and u.email is not null
   and split_part(u.email, '@', 1) ~ '^[a-z0-9_]{3,32}$';

-- ============================================================
-- Account creation, without a service role key
--
-- The admin API would need SUPABASE_SERVICE_ROLE_KEY in the deployment's
-- environment — a key that bypasses row level security entirely, kept
-- next to a public web server, purely so reception can add a member.
-- A definer function does the same job with no new secret: it runs as
-- its owner but refuses anyone who is not an admin, and the check is
-- inside the function where the caller cannot skip it.
-- ============================================================

create or replace function public.admin_create_user(
  p_username  text,
  p_password  text,
  p_full_name text,
  p_role      user_role default 'student'
)
returns uuid
language plpgsql security definer set search_path = public, auth, extensions as $$
declare
  v_id    uuid := gen_random_uuid();
  v_name  text := lower(trim(p_username));
  v_email text;
begin
  if not public.fc_is_admin() then
    raise exception 'only an admin may create accounts' using errcode = '42501';
  end if;

  -- Must match profiles.username_format exactly, or the auth.users
  -- insert succeeds and the profile update then fails halfway through.
  if v_name !~ '^[a-z0-9_]{3,32}$' then
    raise exception 'username must be 3-32 characters of a-z, 0-9 or underscore'
      using errcode = '22023';
  end if;

  if length(p_password) < 8 then
    raise exception 'password must be at least 8 characters' using errcode = '22023';
  end if;

  v_email := v_name || '@fitclub.invalid';

  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'that username is taken' using errcode = '23505';
  end if;

  -- GoTrue reads these token columns into Go strings, which cannot hold
  -- NULL. Accounts created through the API get '', hand-inserted ones do
  -- not, and every sign-in then fails with "Database error querying
  -- schema". Same trap as the demo seed in 0004.
  insert into auth.users (
    instance_id, id, aud, role, email,
    encrypted_password, email_confirmed_at,
    created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current,
    phone_change, phone_change_token, reauthentication_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id,
    'authenticated', 'authenticated', v_email,
    extensions.crypt(p_password, extensions.gen_salt('bf')), now(),
    now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(nullif(trim(p_full_name), ''), v_name)),
    '', '', '', '', '', '', '', ''
  );

  -- signInWithPassword resolves through identities, not just users.
  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', v_email, now(), now()
  );

  -- handle_new_user() already made the profile row on that insert.
  update public.profiles
     set username  = v_name,
         full_name = coalesce(nullif(trim(p_full_name), ''), v_name),
         role      = p_role
   where id = v_id;

  return v_id;
end;
$$;

-- ============================================================
-- Password reset — the desk does it, there is no inbox to mail
-- ============================================================
create or replace function public.admin_set_password(
  p_user_id  uuid,
  p_password text
)
returns void
language plpgsql security definer set search_path = public, auth, extensions as $$
begin
  if not public.fc_is_admin() then
    raise exception 'only an admin may reset passwords' using errcode = '42501';
  end if;

  if length(p_password) < 8 then
    raise exception 'password must be at least 8 characters' using errcode = '22023';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf')),
         updated_at         = now()
   where id = p_user_id;

  if not found then
    raise exception 'no such account' using errcode = 'P0002';
  end if;
end;
$$;

-- Both refuse non-admins internally, but there is no reason for anon to
-- hold the grant at all.
revoke execute on function public.admin_create_user(text, text, text, user_role) from anon;
revoke execute on function public.admin_set_password(uuid, text) from anon;
grant execute on function public.admin_create_user(text, text, text, user_role) to authenticated;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
