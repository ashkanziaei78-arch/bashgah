-- ============================================================
-- Fit Club — phone identity for password sign-in
--
-- A member's mobile number is their username. Supabase supports that
-- natively (signInWithPassword({ phone, password })), but sign-in
-- resolves through auth.identities, not just auth.users — and accounts
-- created by hand only carry the identity they were seeded with.
--
-- Requires the Phone provider to be enabled in the dashboard. Password
-- sign-in sends no SMS, so it needs no SMS provider; the OTP tab needs
-- the Send SMS hook described in the README.
-- ============================================================

insert into auth.identities (id, user_id, identity_data, provider, provider_id, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'phone', u.phone, 'phone_verified', true),
  'phone',
  u.phone,
  now(),
  now()
from auth.users u
where u.phone is not null
  and not exists (
    select 1 from auth.identities i
    where i.user_id = u.id and i.provider = 'phone'
  );

-- An unconfirmed phone cannot be used to sign in.
update auth.users
set phone_confirmed_at = coalesce(phone_confirmed_at, now())
where phone is not null;
