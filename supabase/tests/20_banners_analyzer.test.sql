begin;

select tests.make_user('boss', 'admin');
select tests.make_user('trainer', 'coach');
select tests.make_user('kim');
insert into public.gyms (name, slug, kind) values ('Box', 'box2', 'crossfit');
select tests.make_user('otherboss', 'admin', 'box2');

-- banners: an announcement with a photo and a safe link
select tests.act_as('boss');
insert into public.announcements (title, image_path, link_url, show_in_banner)
  values ('مسابقه‌ی پاییز', 'g/banner.jpg', '/app/events', true);
select tests.expect_error($$insert into public.announcements (title, show_in_banner) values ('بی‌عکس', true)$$, 'banner_needs_image');
select tests.expect_error($$insert into public.announcements (title, image_path, link_url) values ('بد', 'a.jpg', 'javascript:alert(1)')$$, 'link_safe');
select tests.expect_error($$insert into public.announcements (title, image_path, link_url) values ('بد', 'a.jpg', '//evil.example')$$, 'link_safe');
select tests.expect_error($$insert into public.announcements (title, image_path, link_url) values ('بد', 'a.jpg', 'http://plain.example')$$, 'link_safe');
insert into public.announcements (title, image_path, link_url) values ('خوب', 'a.jpg', 'https://instagram.com/fitclub');

select tests.act_as('kim');
select tests.eq((select count(*)::int from public.announcements where show_in_banner), 1, 'a member sees the live banner');
select tests.act_as('otherboss');
select tests.eq((select count(*)::int from public.announcements), 0, 'another gym sees none of it');

-- analyser figures come only from the analyser, entered by staff
select tests.act_as('kim');
insert into public.body_metrics (student_id, weight_kg) values (auth.uid(), 80);
select tests.expect_error($$insert into public.body_metrics (student_id, source, weight_kg, skeletal_muscle_kg) values (auth.uid(), 'self', 80, 35)$$, 'analyzer_only');
select tests.expect_error($$insert into public.body_metrics (student_id, source, weight_kg, skeletal_muscle_kg) values (auth.uid(), 'analyzer', 80, 35)$$, 'row-level security');
select tests.act_as('trainer');
insert into public.body_metrics (student_id, source, weight_kg, skeletal_muscle_kg, fat_mass_kg, protein_kg, minerals_kg, bmi, whr, inbody_score, bmr_kcal)
  values (tests.id('kim'), 'analyzer', 80, 35.2, 16.1, 11.4, 4.1, 24.7, 0.86, 78, 1740);
select tests.expect_error($$insert into public.body_metrics (student_id, source, skeletal_muscle_kg) values (tests.id('kim'), 'analyzer', 300)$$, 'analyzer_sane');
select tests.act_as('kim');
select tests.eq((select bmr_kcal from public.body_metrics where source = 'analyzer'), 1740, 'the member reads their analyser result');

-- gym photos: an admin writes only inside their own gym's folder
select tests.act_as('boss');
insert into storage.objects (bucket_id, name) values ('gym-media', public.fc_gym()::text || '/banner.jpg');
select tests.expect_error(format($$insert into storage.objects (bucket_id, name) values ('gym-media', %L)$$, tests.gym('box2')::text || '/x.jpg'), 'row-level security');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('gym-media', 'root.jpg')$$, 'row-level security');
select tests.act_as('trainer');
select tests.expect_error($$insert into storage.objects (bucket_id, name) values ('gym-media', public.fc_gym()::text || '/c.jpg')$$, 'row-level security');

rollback;
