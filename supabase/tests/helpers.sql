-- Test-only helpers, loaded after the migrations. Never applied to a real project.
create schema if not exists tests;
create table if not exists tests.ids (name text primary key, id uuid not null);
grant usage on schema tests to authenticated, anon;
grant select, insert, update on tests.ids to authenticated, anon;

-- A user with a role, remembered by name.
-- The gym fixtures belong to unless a test says otherwise.
create or replace function tests.gym(p_slug text default 'fitclub') returns uuid
language sql stable as $$ select id from public.gyms where slug = p_slug $$;

create or replace function tests.make_user(p_name text, p_role user_role default 'student', p_gym text default 'fitclub')
returns uuid language plpgsql as $$
declare v uuid := gen_random_uuid();
begin
  insert into auth.users (id, email, raw_user_meta_data)
  values (v, p_name || '@t.invalid', jsonb_build_object('full_name', p_name));
  update public.profiles set role = p_role, gym_id = tests.gym(p_gym) where id = v;
  insert into tests.ids values (p_name, v) on conflict (name) do update set id = excluded.id;
  return v;
end $$;

create or replace function tests.id(p_name text) returns uuid
language sql stable as $$ select id from tests.ids where name = p_name $$;

-- An active subscription on the first plan, from yesterday for 30 days.
create or replace function tests.give_membership(p_name text, p_sessions int default 12, p_used int default 0)
returns uuid language plpgsql as $$
declare v uuid;
begin
  insert into public.memberships (student_id, plan_id, started_on, expires_on, sessions_total, sessions_used, status)
  values (tests.id(p_name), (select id from public.plans where gym_id = (select gym_id from public.profiles where id = tests.id(p_name)) order by sort_order limit 1),
          current_date - 1, current_date + 30, p_sessions, p_used, 'active')
  returning id into v;
  return v;
end $$;

-- Become a signed-in user for the rest of the transaction (null = anon).
create or replace function tests.act_as(p_name text) returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(tests.id(p_name)::text, ''), true);
  execute 'set local role authenticated';
end $$;

-- Back to the superuser that owns the fixtures.
create or replace function tests.act_as_owner() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'reset role';
end $$;

-- Runs a statement and insists it fails with a message containing p_like.
create or replace function tests.expect_error(p_sql text, p_like text) returns void
language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if position(p_like in sqlerrm) = 0 then
      raise exception 'expected error containing "%", got "%" from: %', p_like, sqlerrm, p_sql;
    end if;
    return;
  end;
  raise exception 'expected error containing "%", but it succeeded: %', p_like, p_sql;
end $$;

create or replace function tests.eq(p_got anyelement, p_want anyelement, p_what text) returns void
language plpgsql as $$
begin
  if p_got is distinct from p_want then
    raise exception 'FAIL %: got %, want %', p_what, p_got, p_want;
  end if;
end $$;

grant execute on all functions in schema tests to authenticated, anon;

create or replace function tests.act_as_anon() returns void
language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', '', true);
  execute 'set local role anon';
end $$;
grant execute on all functions in schema tests to authenticated, anon;
