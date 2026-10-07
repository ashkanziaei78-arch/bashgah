-- Second half of 0018: move existing sessions onto the remaining kinds
-- and keep the retired ones out for good.
update public.class_sessions
   set kind = (case kind::text
                 when 'spin'   then 'functional'
                 when 'cardio' then 'hiit'
                 when 'boxing' then 'functional'
                 when 'yoga'   then 'mobility'
                 else 'functional'
               end)::class_kind
 where kind::text in ('spin', 'cardio', 'boxing', 'yoga', 'other');

alter table public.class_sessions alter column kind set default 'functional';
alter table public.class_sessions add constraint class_kind_supported check (
  kind in ('strength', 'hiit', 'functional', 'mobility', 'wod', 'weightlifting', 'gymnastics', 'open_gym')
);
