-- ============================================================
-- Fit Club — photography for the rest of the app
--
-- 0007 gave programmes a cover. The same treatment for the three other
-- places a photo carries real weight:
--
--   exercise-thumbs  every movement in the library, so the workout list
--                    stops being a column of identical grey icons
--   avatars          coaches and members
--   gym-media        the hall itself, for the public site
--
-- All three are public buckets holding nothing private, which lets the
-- service worker cache them and saves signing a URL on every render.
-- ============================================================

-- `avatar_url` has never been read by anything, and what the app stores
-- is a file name inside a bucket rather than a URL. Renaming now, while
-- the column is still unused, is free; later it would not be.
alter table public.profiles rename column avatar_url to avatar_path;

comment on column public.profiles.avatar_path is
  'File inside the avatars bucket, stored as "<user id>/<name>". Null shows initials.';

comment on column public.exercises.thumb_path is
  'File inside the exercise-thumbs bucket. Null falls back to the video/info glyph.';

-- ---------- buckets ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('exercise-thumbs', 'exercise-thumbs', true, 3 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('avatars', 'avatars', true, 2 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('gym-media', 'gym-media', true, 6 * 1024 * 1024,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------- exercise thumbnails: admin owns the library ----------
drop policy if exists exercise_thumbs_read on storage.objects;
create policy exercise_thumbs_read on storage.objects for select
  using (bucket_id = 'exercise-thumbs');

drop policy if exists exercise_thumbs_write on storage.objects;
create policy exercise_thumbs_write on storage.objects for all
  using (bucket_id = 'exercise-thumbs' and public.fc_is_admin())
  with check (bucket_id = 'exercise-thumbs' and public.fc_is_admin());

-- ---------- avatars ----------
-- Files live under a folder named for the owner, which is what lets a
-- member replace their own photo without being able to touch anyone
-- else's. Staff can write anywhere in the bucket, because reception
-- takes most of these at the desk.
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists avatars_write on storage.objects;
create policy avatars_write on storage.objects for all
  using (
    bucket_id = 'avatars'
    and (public.fc_is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
  )
  with check (
    bucket_id = 'avatars'
    and (public.fc_is_staff() or (storage.foldername(name))[1] = auth.uid()::text)
  );

-- ---------- gym photography for the public site ----------
drop policy if exists gym_media_read on storage.objects;
create policy gym_media_read on storage.objects for select
  using (bucket_id = 'gym-media');

drop policy if exists gym_media_write on storage.objects;
create policy gym_media_write on storage.objects for all
  using (bucket_id = 'gym-media' and public.fc_is_admin())
  with check (bucket_id = 'gym-media' and public.fc_is_admin());

-- The landing hero, so the owner can change it without a deploy.
insert into public.settings (key, value)
values ('gym_hero_path', 'null'::jsonb)
on conflict (key) do nothing;
