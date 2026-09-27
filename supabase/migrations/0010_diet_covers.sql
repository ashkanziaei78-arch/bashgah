-- ============================================================
-- Fit Club — a cover photo for the diet plan
--
-- The nutrition tab is the other screen a member opens daily, and it was
-- the only one still opening on plain type. Same treatment as the
-- programme card in 0007.
--
-- It shares the program-covers bucket rather than adding a fifth one:
-- both are plan artwork written by staff and read by anyone, so the
-- policies are identical and a second bucket would only be a second
-- place to get them wrong.
-- ============================================================

alter table public.diet_plans
  add column if not exists cover_path text;

comment on column public.diet_plans.cover_path is
  'File in the program-covers bucket, or an absolute URL. Null renders the gradient fallback.';
