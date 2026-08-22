-- ===========================================================================
-- 0004 — Quiz et exercices
-- ===========================================================================

create table public.quizzes (
  id                 uuid primary key default gen_random_uuid(),
  scope              quiz_scope not null default 'lesson',
  lesson_id          uuid references public.lessons (id)  on delete cascade,
  chapter_id         uuid references public.chapters (id) on delete cascade,
  course_id          uuid not null references public.courses (id) on delete cascade,
  title              text not null,
  description        text,
  passing_score      integer not null default 60 check (passing_score between 0 and 100),
  max_attempts       integer check (max_attempts is null or max_attempts > 0),
  time_limit_seconds integer check (time_limit_seconds is null or time_limit_seconds > 0),
  shuffle_questions  boolean not null default false,
  show_explanations  boolean not null default true,
  sort_order         integer not null default 0,
  status             content_status not null default 'published',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint quizzes_scope_target check (
    (scope = 'lesson'  and lesson_id is not null and chapter_id is null) or
    (scope = 'chapter' and chapter_id is not null and lesson_id is null) or
    (scope = 'course'  and lesson_id is null and chapter_id is null)
  )
);
create index quizzes_lesson_idx on public.quizzes (lesson_id, sort_order);
create index quizzes_course_idx on public.quizzes (course_id, status);

create table public.questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes (id) on delete cascade,
  type        question_type not null,
  prompt      text not null,
  explanation text,
  media_url   text,
  points      numeric(6, 2) not null default 1 check (points > 0),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index questions_quiz_idx on public.questions (quiz_id, sort_order);

create table public.answers (
  id            uuid primary key default gen_random_uuid(),
  question_id   uuid not null references public.questions (id) on delete cascade,
  label         text not null,
  is_correct    boolean not null default false,
  match_pattern text,
  sort_order    integer not null default 0,
  created_at    timestamptz not null default now()
);
create index answers_question_idx on public.answers (question_id, sort_order);

create table public.quiz_attempts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles (id) on delete cascade,
  quiz_id          uuid not null references public.quizzes (id)  on delete cascade,
  attempt_number   integer not null,
  score            numeric(7, 2) not null default 0,
  max_score        numeric(7, 2) not null default 0,
  percentage       numeric(5, 2) not null default 0,
  passed           boolean not null default false,
  started_at       timestamptz not null default now(),
  submitted_at     timestamptz,
  duration_seconds integer,
  unique (user_id, quiz_id, attempt_number)
);
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, submitted_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id);

create table public.quiz_attempt_answers (
  id                  uuid primary key default gen_random_uuid(),
  attempt_id          uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id         uuid not null references public.questions (id)     on delete cascade,
  selected_answer_ids uuid[] not null default '{}',
  text_answer         text,
  is_correct          boolean not null default false,
  points_awarded      numeric(6, 2) not null default 0,
  unique (attempt_id, question_id)
);
create index quiz_attempt_answers_attempt_idx on public.quiz_attempt_answers (attempt_id);

create table public.exercises (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  kind            exercise_kind not null default 'open_answer',
  title           text not null,
  statement_md    text not null,
  media_url       text,
  attachment_path text,
  expected_answer text,
  tolerance       numeric,
  solution_md     text,
  explanation_md  text,
  difficulty      difficulty_level not null default 'beginner',
  sort_order      integer not null default 0,
  status          content_status not null default 'published',
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index exercises_lesson_idx on public.exercises (lesson_id, sort_order);

create table public.exercise_attempts (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles (id)  on delete cascade,
  exercise_id     uuid not null references public.exercises (id) on delete cascade,
  response_text   text,
  response_path   text,
  is_correct      boolean,
  self_assessment smallint check (self_assessment between 0 and 2),
  submitted_at    timestamptz not null default now()
);
create index exercise_attempts_user_idx on public.exercise_attempts (user_id, exercise_id);

drop trigger if exists quizzes_set_updated_at on public.quizzes;
create trigger quizzes_set_updated_at
  before update on public.quizzes   for each row execute function public.set_updated_at();
drop trigger if exists questions_set_updated_at on public.questions;
create trigger questions_set_updated_at
  before update on public.questions for each row execute function public.set_updated_at();
drop trigger if exists exercises_set_updated_at on public.exercises;
create trigger exercises_set_updated_at
  before update on public.exercises for each row execute function public.set_updated_at();

-- Dénormalisation de course_id sur les quiz, comme pour chapitres et leçons.
create or replace function public.sync_quiz_denorm()
returns trigger
language plpgsql
as $$
begin
  if new.scope = 'lesson' then
    select l.course_id into new.course_id from public.lessons l where l.id = new.lesson_id;
  elsif new.scope = 'chapter' then
    select c.course_id into new.course_id from public.chapters c where c.id = new.chapter_id;
  end if;
  return new;
end;
$$;

drop trigger if exists quizzes_sync_denorm on public.quizzes;
create trigger quizzes_sync_denorm
  before insert or update of lesson_id, chapter_id, scope on public.quizzes
  for each row execute function public.sync_quiz_denorm();
