-- ===========================================================================
-- 0006 — Notes, favoris, gamification, objectifs, notifications
-- ===========================================================================

create table public.notes (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  lesson_id         uuid not null references public.lessons (id)  on delete cascade,
  video_id          uuid references public.videos (id) on delete set null,
  timestamp_seconds integer check (timestamp_seconds >= 0),
  content           text not null check (char_length(content) between 1 and 5000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index notes_user_idx   on public.notes (user_id, created_at desc);
create index notes_lesson_idx on public.notes (user_id, lesson_id, timestamp_seconds);

create table public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  course_id   uuid references public.courses (id)   on delete cascade,
  lesson_id   uuid references public.lessons (id)   on delete cascade,
  video_id    uuid references public.videos (id)    on delete cascade,
  resource_id uuid references public.resources (id) on delete cascade,
  created_at  timestamptz not null default now(),
  constraint favorites_one_target check (
    num_nonnulls(course_id, lesson_id, video_id, resource_id) = 1
  )
);
create unique index favorites_course_uidx   on public.favorites (user_id, course_id)   where course_id is not null;
create unique index favorites_lesson_uidx   on public.favorites (user_id, lesson_id)   where lesson_id is not null;
create unique index favorites_video_uidx    on public.favorites (user_id, video_id)    where video_id is not null;
create unique index favorites_resource_uidx on public.favorites (user_id, resource_id) where resource_id is not null;
create index favorites_user_idx on public.favorites (user_id, created_at desc);

create table public.badges (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  name        text not null,
  description text not null,
  icon        text not null,
  category    text not null default 'general',
  criteria    jsonb not null,
  xp_reward   integer not null default 0,
  sort_order  integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table public.user_badges (
  user_id   uuid not null references public.profiles (id) on delete cascade,
  badge_id  uuid not null references public.badges (id)   on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
create index user_badges_user_idx on public.user_badges (user_id, earned_at desc);

create table public.xp_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  amount       integer not null check (amount <> 0),
  reason       xp_reason not null,
  source_table text,
  source_id    uuid,
  created_at   timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id, created_at desc);
-- Empêche de gagner deux fois l'XP d'une même leçon ou d'un même quiz.
create unique index xp_events_unique_source_idx
  on public.xp_events (user_id, reason, source_table, source_id)
  where source_id is not null;

create table public.goals (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  type         goal_type not null,
  target_value integer not null check (target_value > 0),
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create unique index goals_active_uidx on public.goals (user_id, type) where is_active;

create table public.goal_periods (
  id             uuid primary key default gen_random_uuid(),
  goal_id        uuid not null references public.goals (id)    on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  period_start   date not null,
  period_end     date not null,
  achieved_value integer not null default 0,
  target_value   integer not null,
  achieved       boolean not null default false,
  unique (goal_id, period_start)
);
create index goal_periods_user_idx on public.goal_periods (user_id, period_start desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  type       notification_type not null,
  title      text not null,
  body       text,
  link_url   text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx   on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.notification_preferences (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  new_course     boolean not null default true,
  new_lesson     boolean not null default true,
  new_quiz       boolean not null default true,
  goal_reached   boolean not null default true,
  badge_earned   boolean not null default true,
  study_reminder boolean not null default false,
  email_enabled  boolean not null default false,
  updated_at     timestamptz not null default now()
);

create table public.user_subject_interests (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, subject_id)
);
create index user_subject_interests_subject_idx on public.user_subject_interests (subject_id);

drop trigger if exists notes_set_updated_at on public.notes;
create trigger notes_set_updated_at
  before update on public.notes                    for each row execute function public.set_updated_at();
drop trigger if exists goals_set_updated_at on public.goals;
create trigger goals_set_updated_at
  before update on public.goals                    for each row execute function public.set_updated_at();
drop trigger if exists notif_prefs_set_updated_at on public.notification_preferences;
create trigger notif_prefs_set_updated_at
  before update on public.notification_preferences for each row execute function public.set_updated_at();

-- notification_preferences existe désormais : le trigger d'inscription peut
-- être branché sur auth.users.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
