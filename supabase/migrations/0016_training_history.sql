-- ============================================================
-- Fit Club — a member can read their own training history
--
-- Programmes are versioned: publishing a new one archives the old, so
-- workout_logs keep pointing at the exact item the member lifted. But
-- the read policies only let a member see their *published* programme,
-- so every log against an archived one lost its exercise the moment the
-- coach published an update. The progress page's strength records
-- quietly shrank to "since the last programme change", and the new
-- muscle-balance chart would have done the same.
--
-- Archived programmes are the member's own past, so they may read
-- them. Drafts stay hidden — a coach's half-written next block is not
-- the member's yet. Every screen that shows "your programme" already
-- filters on status = 'published', so nothing else changes.
-- ============================================================

-- ALTER rather than drop-and-create: the policy is never absent, not
-- even inside the transaction.
alter policy programs_read on public.programs
  using (
    (student_id = auth.uid() and status in ('published', 'archived'))
    or coach_id = auth.uid()
    or public.fc_is_staff()
  );

alter policy program_items_read on public.program_items
  using (exists (
    select 1 from public.programs p
     where p.id = program_id
       and ((p.student_id = auth.uid() and p.status in ('published', 'archived'))
            or p.coach_id = auth.uid()
            or public.fc_is_staff())
  ));
