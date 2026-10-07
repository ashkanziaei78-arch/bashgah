begin;

select tests.make_user('boss', 'admin');
select tests.make_user('trainer', 'coach');
select tests.make_user('kim');

-- only the admin posts
select tests.act_as('boss');
insert into public.announcements (title, body, tone) values ('تعطیلی ۱۳ آبان', 'باشگاه بسته است.', 'alert');
insert into public.announcements (title, publish_from, publish_until) values ('هفته‌ی بعد', current_date + 7, current_date + 9);
insert into public.announcements (title, publish_from, publish_until) values ('تمام‌شده', current_date - 9, current_date - 2);
select tests.act_as('trainer');
select tests.expect_error($$insert into public.announcements (title) values ('مربی')$$, 'row-level security');
select tests.eq((select count(*)::int from public.announcements), 3, 'staff see every announcement');
select tests.act_as('kim');
select tests.eq((select count(*)::int from public.announcements), 1, 'a member sees only what is live today');
select tests.expect_error($$insert into public.announcements (title) values ('من')$$, 'row-level security');
update public.announcements set title = 'x';
select tests.act_as_owner();
select tests.eq((select count(*)::int from public.announcements where title = 'x'), 0, 'a member cannot edit');
select tests.act_as('kim');
select tests.act_as_anon();
select tests.expect_error($$select * from public.announcements$$, 'permission denied');

-- bad data is refused
select tests.act_as('boss');
select tests.expect_error($$insert into public.announcements (title, publish_from, publish_until) values ('بازه', current_date, current_date - 1)$$, 'window_sane');

-- leads: staff only
select tests.act_as('trainer');
insert into public.leads (full_name, phone, source) values ('سارا', '09121234567', 'instagram');
select tests.expect_error($$insert into public.leads (full_name, phone) values ('بد', '0912-123')$$, 'phone_digits');
update public.leads set status = 'contacted' where full_name = 'سارا';
select tests.eq((select updated_at > created_at or updated_at = created_at from public.leads where full_name = 'سارا'), true, 'touch trigger runs');
select tests.act_as('kim');
select tests.eq((select count(*)::int from public.leads), 0, 'members cannot see prospects');
select tests.expect_error($$insert into public.leads (full_name) values ('من')$$, 'row-level security');

rollback;
