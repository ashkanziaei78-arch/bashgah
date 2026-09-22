-- Exercise videos: the bucket the schema has referred to since 0001.
--
-- `exercises.video_path` was documented as "Storage path in bucket
-- 'exercise-videos'" and that bucket was never created, so the feature
-- the landing page advertises most loudly had nowhere to put a file.
--
-- Public read rather than signed URLs: these are demonstration clips of
-- a barbell, not member data. Signing every one of them would cost a
-- round trip per exercise on the slowest connection in the building —
-- the gym floor — to protect something that is not private. Writing
-- stays behind staff.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'exercise-videos',
  'exercise-videos',
  true,
  -- A form demo is fifteen seconds. Anything past 50MB is a mistake,
  -- and rejecting it at the door beats discovering it on a phone.
  52428800,
  array['video/mp4', 'video/webm', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage policies live on storage.objects, which already has RLS on.
drop policy if exists exercise_videos_read on storage.objects;
create policy exercise_videos_read on storage.objects
  for select
  using (bucket_id = 'exercise-videos');

drop policy if exists exercise_videos_write on storage.objects;
create policy exercise_videos_write on storage.objects
  for all
  to authenticated
  using (bucket_id = 'exercise-videos' and public.fc_is_staff())
  with check (bucket_id = 'exercise-videos' and public.fc_is_staff());
