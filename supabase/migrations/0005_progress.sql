-- ===========================================================================
-- 0005 — Progression et temps d'étude
-- ===========================================================================

create table public.video_progress (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  video_id         uuid not null references public.videos (id)   on delete cascade,
  lesson_id        uuid not null references public.lessons (id)  on delete cascade,
  position_seconds integer not null default 0 check (position_seconds >= 0),
  watched_seconds  integer not null default 0 check (watched_seconds >= 0),
  duration_seconds integer not null default 0,
  percent          numeric(5, 2) not null default 0,
  completed        boolean not null default false,
  last_watched_at  timestamptz not null default now(),
  unique (user_id, video_id)
);
create index video_progress_user_idx   on public.video_progress (user_id, last_watched_at desc);
create index video_progress_lesson_idx on public.video_progress (user_id, lesson_id);

create table public.lesson_progress (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles (id) on delete cascade,
  lesson_id          uuid not null references public.lessons (id)  on delete cascade,
  course_id          uuid not null references public.courses (id)  on delete cascade,
  status             progress_status not null default 'not_started',
  time_spent_seconds integer not null default 0,
  last_viewed_at     timestamptz not null default now(),
  completed_at       timestamptz,
  unique (user_id, lesson_id)
);
create index lesson_progress_user_course_idx on public.lesson_progress (user_id, course_id);
create index lesson_progress_recent_idx      on public.lesson_progress (user_id, last_viewed_at desc);

create table public.course_progress (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  course_id         uuid not null references public.courses (id)  on delete cascade,
  lessons_completed integer not null default 0,
  lessons_total     integer not null default 0,
  percent           numeric(5, 2) not null default 0,
  status            progress_status not null default 'in_progress',
  last_lesson_id    uuid references public.lessons (id) on delete set null,
  started_at        timestamptz not null default now(),
  last_activity_at  timestamptz not null default now(),
  completed_at      timestamptz,
  unique (user_id, course_id)
);
create index course_progress_user_idx on public.course_progress (user_id, last_activity_at desc);

create table public.study_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  course_id        uuid references public.courses (id) on delete set null,
  lesson_id        uuid references public.lessons (id) on delete set null,
  started_at       timestamptz not null default now(),
  ended_at         timestamptz,
  duration_seconds integer not null default 0 check (duration_seconds >= 0)
);
create index study_sessions_user_idx on public.study_sessions (user_id, started_at desc);

-- --- Vues dérivées ------------------------------------------------------
-- Chapitre et module terminés sont CALCULÉS, jamais stockés : une seule
-- source de vérité (lesson_progress), donc aucune désynchronisation possible.
-- security_invoker : la RLS de lesson_progress s'applique à l'appelant.

create view public.v_chapter_progress
with (security_invoker = true) as
select
  lp.user_id,
  l.chapter_id,
  l.course_id,
  count(*)::int                                             as lessons_total,
  count(*) filter (where lp.status = 'completed')::int       as lessons_completed,
  bool_and(lp.status = 'completed')                          as completed
from public.lessons l
join public.lesson_progress lp on lp.lesson_id = l.id
where l.status = 'published'
group by lp.user_id, l.chapter_id, l.course_id;

create view public.v_module_progress
with (security_invoker = true) as
select
  lp.user_id,
  l.module_id,
  l.course_id,
  count(*)::int                                             as lessons_total,
  count(*) filter (where lp.status = 'completed')::int       as lessons_completed,
  bool_and(lp.status = 'completed')                          as completed
from public.lessons l
join public.lesson_progress lp on lp.lesson_id = l.id
where l.status = 'published'
group by lp.user_id, l.module_id, l.course_id;
