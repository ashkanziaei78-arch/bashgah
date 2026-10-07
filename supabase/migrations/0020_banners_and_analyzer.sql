-- ============================================================
-- Fit Club — home-screen banners, and the body analyser's full readout
--
-- Banners: an announcement can now carry a photo and a link and be
-- shown in the swipeable strip at the top of the member's home screen.
-- Same table, same publish window, same RLS: a banner is a club news
-- item that earned a picture.
--
-- Analyser: the body composition machine reports more than the scale
-- columns 0012 made room for. These figures only ever come from that
-- machine, so a row carrying any of them must be an 'analyzer' row,
-- and members can never write one (body_metrics_self_write already
-- limits them to source = 'self').
-- ============================================================

alter table public.announcements
  add column image_path     text,
  add column link_url       text,
  add column show_in_banner boolean not null default false,
  -- In-app paths or https links only: a banner must never become a
  -- javascript: or data: URL handed to every member's phone.
  add constraint link_safe check (link_url is null or link_url ~ '^(/[^/]|https://)'),
  add constraint banner_needs_image check (not show_in_banner or image_path is not null);

create index announcements_banner on public.announcements (gym_id, show_in_banner)
  where show_in_banner;

alter table public.body_metrics
  add column skeletal_muscle_kg numeric(5,1),
  add column fat_mass_kg        numeric(5,1),
  add column protein_kg         numeric(4,1),
  add column minerals_kg        numeric(4,1),
  add column bmi                numeric(4,1),
  add column whr                numeric(3,2),
  add column inbody_score       smallint,
  add constraint analyzer_only check (
    source = 'analyzer' or (
      skeletal_muscle_kg is null and fat_mass_kg is null and protein_kg is null
      and minerals_kg is null and bmi is null and whr is null and inbody_score is null
    )
  ),
  add constraint analyzer_sane check (
        (skeletal_muscle_kg is null or skeletal_muscle_kg between 5 and 120)
    and (fat_mass_kg is null or fat_mass_kg between 0.5 and 200)
    and (protein_kg is null or protein_kg between 1 and 40)
    and (minerals_kg is null or minerals_kg between 0.5 and 10)
    and (bmi is null or bmi between 10 and 80)
    and (whr is null or whr between 0.5 and 1.5)
    and (inbody_score is null or inbody_score between 30 and 120)
  );

-- ------------------------------------------------------------
-- Gym photos are per gym now: an admin writes only inside a folder
-- named for their own gym, so one gym cannot replace or delete
-- another's banner. Files uploaded before this, at the bucket root,
-- stay readable and become read-only.
-- ------------------------------------------------------------
alter policy gym_media_write on storage.objects
  using (
    bucket_id = 'gym-media'
    and public.fc_admin_of(public.fc_gym())
    and (storage.foldername(name))[1] = public.fc_gym()::text
  )
  with check (
    bucket_id = 'gym-media'
    and public.fc_admin_of(public.fc_gym())
    and (storage.foldername(name))[1] = public.fc_gym()::text
  );
