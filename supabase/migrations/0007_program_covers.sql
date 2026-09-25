-- ============================================================
-- Fit Club — cover photography for programmes
--
-- The programme card is the one screen a member opens every training
-- day, so it carries a photo. The file lives in Storage rather than as a
-- URL column: an external link rots, and the service worker cannot
-- cache a host it does not control.
--
-- `cover_path` is nullable on purpose. A programme without a photo falls
-- back to a designed gradient (.fc-cover-fallback), so the gym can add
-- imagery gradually instead of needing a full library before the feature
-- works at all.
-- ============================================================

alter table public.programs
  add column if not exists cover_path text;

comment on column public.programs.cover_path is
  'File name inside the program-covers bucket. Null renders the gradient fallback.';

-- ---------- storage ----------
-- Public read: covers are decorative, they carry nothing private, and a
-- public bucket means the PWA can cache them without minting a signed
-- URL on every render.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'program-covers',
  'program-covers',
  true,
  5 * 1024 * 1024,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may look; only staff may put a file there or replace one.
drop policy if exists program_covers_read on storage.objects;
create policy program_covers_read on storage.objects for select
  using (bucket_id = 'program-covers');

drop policy if exists program_covers_write on storage.objects;
create policy program_covers_write on storage.objects for insert
  with check (bucket_id = 'program-covers' and public.fc_is_staff());

drop policy if exists program_covers_update on storage.objects;
create policy program_covers_update on storage.objects for update
  using (bucket_id = 'program-covers' and public.fc_is_staff())
  with check (bucket_id = 'program-covers' and public.fc_is_staff());

drop policy if exists program_covers_delete on storage.objects;
create policy program_covers_delete on storage.objects for delete
  using (bucket_id = 'program-covers' and public.fc_is_admin());
