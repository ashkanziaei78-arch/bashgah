-- ============================================================
-- Fit Club — class types for bodybuilding gyms and CrossFit boxes only
--
-- The app is for two kinds of gym. Spinning, yoga and boxing are other
-- businesses; offering them in the class picker only invited a coach to
-- run something the software was never shaped for. The kinds are now
-- the ones those two gyms actually timetable:
--
--   bodybuilding  strength · hiit · functional · mobility
--   crossfit      wod · weightlifting · gymnastics · hiit · mobility · open_gym
--
-- Which of them a gym is offered is decided by gyms.kind, in the app.
-- Existing sessions are mapped to the nearest remaining kind.
--
-- Postgres cannot remove a value from an enum without rebuilding the
-- type, and rebuilding means dropping the schedule function that returns
-- it. Instead the old values stay in the type and a check constraint
-- keeps them out of the table — same guarantee, no drops.
-- ============================================================

-- Added values cannot be used in the transaction that adds them, so the
-- remap lives in 0018b.
alter type class_kind add value if not exists 'strength';
alter type class_kind add value if not exists 'hiit';
alter type class_kind add value if not exists 'functional';
alter type class_kind add value if not exists 'mobility';
alter type class_kind add value if not exists 'wod';
alter type class_kind add value if not exists 'weightlifting';
alter type class_kind add value if not exists 'gymnastics';
alter type class_kind add value if not exists 'open_gym';
