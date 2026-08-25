-- ===========================================================================
-- INSTALLATION COMPLÈTE DU SCHÉMA — AtelierDigital
--
-- Concaténation de supabase/migrations/, dans l'ordre.
-- Généré par scripts/build-install-sql.mjs : ne pas éditer à la main.
--
-- USAGE
--   Supabase Dashboard > SQL Editor > New query > coller ce fichier > Run
--   ou : psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/install.sql
--
-- Le fichier commence par une vérification préalable : si le schéma public
-- contient déjà des tables du même nom, l'exécution s'arrête avec la marche
-- à suivre, sans rien modifier.
--
-- Les données de démonstration sont dans supabase/seed.sql, à exécuter APRÈS.
-- ===========================================================================


-- ###########################################################################
-- ### 0000_preflight.sql
-- ###########################################################################

-- ===========================================================================
-- 0000 — Vérification préalable. À EXÉCUTER EN PREMIER.
--
-- Si le schéma `public` contient déjà des objets portant les mêmes noms que
-- ceux de cette application, la migration 0002 échoue sur « relation already
-- exists » — et toutes les suivantes échouent en cascade, avec des messages
-- qui n'ont plus aucun rapport avec la cause réelle.
--
-- Le cas le plus fréquent : un projet Supabase où le guide de démarrage
-- « User Management » a déjà été exécuté. Il crée une table `public.profiles`
-- avec les colonnes username / full_name / website, incompatible avec celle
-- de cette application.
--
-- Ce fichier ne modifie rien. Il s'arrête net avec la marche à suivre.
-- ===========================================================================

do $$
declare
  v_conflits text[];
  v_liste    text;
begin
  select array_agg(c.relname order by c.relname)
    into v_conflits
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind in ('r', 'v')          -- tables et vues
    and c.relname = any (array[
      'profiles', 'levels', 'subjects', 'level_subjects', 'courses', 'modules',
      'chapters', 'lessons', 'videos', 'resources', 'quizzes', 'questions',
      'answers', 'quiz_attempts', 'quiz_attempt_answers', 'exercises',
      'exercise_attempts', 'video_progress', 'lesson_progress',
      'course_progress', 'study_sessions', 'notes', 'favorites', 'badges',
      'user_badges', 'xp_events', 'goals', 'goal_periods', 'notifications',
      'notification_preferences', 'user_subject_interests', 'enrollments',
      'access_codes', 'code_redemptions'
    ]);

  if v_conflits is null then
    raise notice '';
    raise notice '  Vérification préalable réussie : le schéma public est libre.';
    raise notice '  Appliquez maintenant 0001 à 0011, dans l''ordre.';
    raise notice '';
    return;
  end if;

  v_liste := array_to_string(v_conflits, ', ');

  raise exception E'\n\n'
    '  ================================================================\n'
    '  ARRÊT : le schéma public contient déjà ces objets\n'
    '  ================================================================\n\n'
    '    %\n\n'
    '  Appliquer les migrations par-dessus produirait une base incohérente :\n'
    '  la migration 0002 échouerait sur « relation already exists », et toutes\n'
    '  les suivantes en cascade.\n\n'
    '  QUE FAIRE\n\n'
    '  • Projet neuf (cas le plus fréquent — table créée par le guide de\n'
    '    démarrage Supabase, sans données utiles) :\n'
    '    exécutez supabase/tools/reset_public_schema.sql, puis reprenez\n'
    '    à la migration 0001.\n\n'
    '  • Projet contenant des données que vous voulez garder :\n'
    '    ne lancez rien. Renommez ou déplacez les tables en conflit, ou\n'
    '    installez cette application dans un projet Supabase distinct.\n\n'
    '  Pour voir ce que contiennent ces tables avant de décider :\n'
    '    select table_name, column_name, data_type\n'
    '    from information_schema.columns\n'
    '    where table_schema = ''public''\n'
    '    order by table_name, ordinal_position;\n',
    v_liste
    using errcode = 'raise_exception';
end $$;

-- ###########################################################################
-- ### 0001_extensions_enums.sql
-- ###########################################################################

-- ===========================================================================
-- 0001 — Extensions, types énumérés et utilitaires transverses
-- ===========================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- --- Types --------------------------------------------------------------
do $$ begin
  create type user_role         as enum ('student', 'teacher', 'admin');
  create type content_status    as enum ('draft', 'published', 'archived');
  create type difficulty_level  as enum ('beginner', 'intermediate', 'advanced');
  create type video_provider    as enum ('native', 'youtube', 'google_drive', 'cloudflare_stream', 'vimeo');
  create type resource_type     as enum ('pdf', 'document', 'image', 'link', 'file', 'archive');
  create type question_type     as enum ('single_choice', 'multiple_choice', 'true_false', 'short_answer');
  create type quiz_scope        as enum ('lesson', 'chapter', 'course');
  create type progress_status   as enum ('not_started', 'in_progress', 'completed');
  create type exercise_kind     as enum ('open_answer', 'numeric', 'file_upload', 'interactive');
  create type goal_type         as enum ('daily_minutes', 'weekly_minutes', 'daily_lessons', 'weekly_lessons');
  create type notification_type as enum ('new_course', 'new_lesson', 'new_quiz', 'goal_reached', 'badge_earned', 'study_reminder', 'system');
  create type xp_reason         as enum ('lesson_completed', 'quiz_passed', 'course_completed', 'badge_earned', 'streak_bonus', 'goal_reached');
  create type access_scope      as enum ('all', 'subject', 'course');
exception
  when duplicate_object then null;
end $$;

-- --- Horodatage ---------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Normalisation utilisée pour la correction des réponses courtes et la
-- recherche : minuscules, sans accent, sans espace superflu.
create or replace function public.normalize_text(p_input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(unaccent(coalesce(p_input, ''))), '\s+', ' ', 'g');
$$;

-- ###########################################################################
-- ### 0002_identity.sql
-- ###########################################################################

-- ===========================================================================
-- 0002 — Identité : profils et centres d'intérêt
-- La FK profiles.level_id est ajoutée en 0003 (levels n'existe pas encore).
-- ===========================================================================

create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  first_name         text,
  last_name          text,
  avatar_url         text,
  role               user_role   not null default 'student',
  level_id           uuid,
  bio                text,
  xp                 integer     not null default 0 check (xp >= 0),
  streak_current     integer     not null default 0 check (streak_current >= 0),
  streak_longest     integer     not null default 0 check (streak_longest >= 0),
  last_activity_date date,
  onboarding_done    boolean     not null default false,
  is_active          boolean     not null default true,
  timezone           text        not null default 'Europe/Paris',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index profiles_role_idx     on public.profiles (role);
create index profiles_level_id_idx on public.profiles (level_id);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- --- Helpers d'autorisation ---------------------------------------------
-- SECURITY DEFINER : ces fonctions lisent profiles sans redéclencher la RLS
-- de profiles, ce qui éviterait sinon une récursion infinie de policy.

create or replace function public.auth_role()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin', 'teacher') from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- --- Création automatique du profil -------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data ->> 'first_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'last_name'), ''),
    nullif(trim(new.raw_user_meta_data ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  insert into public.notification_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- Le trigger est créé en 0006, une fois notification_preferences disponible.

-- --- Garde des colonnes privilégiées ------------------------------------
-- La policy « profiles_update_own » autorise un membre à modifier sa ligne.
-- Sans ce trigger, il pourrait s'attribuer role = 'admin' ou 999999 XP.
create or replace function public.profiles_guard_privileged_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Les fonctions SECURITY DEFINER légitimes (award_xp, touch_streak…) posent
  -- ce drapeau transactionnel avant d'écrire. Il n'est atteignable que depuis
  -- le SQL serveur : set_config n'est pas exposé par PostgREST.
  if coalesce(current_setting('app.privileged', true), '') = 'on' then
    return new;
  end if;

  -- Aucun JWT : la requête ne vient pas d'un client PostgREST authentifié mais
  -- d'une session SQL directe (éditeur SQL Supabase, migration, clé
  -- service_role). C'est le seul chemin par lequel le PREMIER administrateur
  -- peut être promu — sans quoi la promotion serait impossible, personne
  -- n'étant admin au départ.
  --
  -- Ce n'est pas une faille : un visiteur anonyme a lui aussi auth.uid() nul,
  -- mais la policy profiles_update_own exige id = auth.uid(), donc il ne peut
  -- atteindre aucune ligne. Le trigger n'est jamais joué pour lui.
  if auth.uid() is null then
    return new;
  end if;

  if public.is_admin() then
    return new;
  end if;

  new.role               := old.role;
  new.xp                 := old.xp;
  new.streak_current     := old.streak_current;
  new.streak_longest     := old.streak_longest;
  new.last_activity_date := old.last_activity_date;
  new.is_active          := old.is_active;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged on public.profiles;
create trigger profiles_guard_privileged
  before update on public.profiles
  for each row execute function public.profiles_guard_privileged_columns();

-- ###########################################################################
-- ### 0003_content.sql
-- ###########################################################################

-- ===========================================================================
-- 0003 — Hiérarchie de contenu
-- Parcours → Domaine → Formation → Module → Chapitre → Leçon → Vidéo
-- ===========================================================================

create table public.levels (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  integer     not null default 0,
  status      content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index levels_order_idx on public.levels (status, sort_order);

create table public.subjects (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  icon        text,
  color       text,
  sort_order  integer not null default 0,
  status      content_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index subjects_order_idx on public.subjects (status, sort_order);

create table public.level_subjects (
  level_id   uuid not null references public.levels (id)   on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  sort_order integer not null default 0,
  primary key (level_id, subject_id)
);
create index level_subjects_subject_idx on public.level_subjects (subject_id);

-- FK différée depuis 0002
alter table public.profiles
  add constraint profiles_level_id_fkey
  foreign key (level_id) references public.levels (id) on delete set null;

create table public.courses (
  id               uuid primary key default gen_random_uuid(),
  slug             text not null unique,
  title            text not null,
  summary          text,
  description      text,
  thumbnail_url    text,
  level_id         uuid not null references public.levels (id)   on delete restrict,
  subject_id       uuid not null references public.subjects (id) on delete restrict,
  difficulty       difficulty_level not null default 'beginner',
  lessons_count    integer not null default 0,
  duration_seconds integer not null default 0,
  sort_order       integer not null default 0,
  status           content_status not null default 'draft',
  published_at     timestamptz,
  created_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  search_vector    tsvector generated always as (
    setweight(to_tsvector('french', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('french', coalesce(summary, '')), 'B') ||
    setweight(to_tsvector('french', coalesce(description, '')), 'C')
  ) stored
);
create index courses_level_subject_idx on public.courses (level_id, subject_id, status);
create index courses_status_idx        on public.courses (status, sort_order);
create index courses_search_idx        on public.courses using gin (search_vector);

create table public.modules (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  status      content_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index modules_course_idx on public.modules (course_id, sort_order);

create table public.chapters (
  id          uuid primary key default gen_random_uuid(),
  module_id   uuid not null references public.modules (id) on delete cascade,
  course_id   uuid not null references public.courses (id) on delete cascade,
  title       text not null,
  description text,
  sort_order  integer not null default 0,
  status      content_status not null default 'published',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index chapters_module_idx on public.chapters (module_id, sort_order);
create index chapters_course_idx on public.chapters (course_id);

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  chapter_id       uuid not null references public.chapters (id) on delete cascade,
  module_id        uuid not null references public.modules (id)  on delete cascade,
  course_id        uuid not null references public.courses (id)  on delete cascade,
  slug             text not null,
  title            text not null,
  description      text,
  content_md       text,
  duration_seconds integer not null default 0,
  sort_order       integer not null default 0,
  is_free_preview  boolean not null default false,
  status           content_status not null default 'published',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (course_id, slug)
);
create index lessons_chapter_idx on public.lessons (chapter_id, sort_order);
create index lessons_course_idx  on public.lessons (course_id, status);

create table public.videos (
  id               uuid primary key default gen_random_uuid(),
  lesson_id        uuid not null references public.lessons (id) on delete cascade,
  title            text not null,
  description      text,
  provider         video_provider not null default 'native',
  external_id      text,
  url              text,
  thumbnail_url    text,
  duration_seconds integer not null default 0 check (duration_seconds >= 0),
  sort_order       integer not null default 0,
  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint videos_source_present check (
    (provider = 'native' and url is not null) or
    (provider <> 'native' and external_id is not null)
  )
);
create index videos_lesson_idx on public.videos (lesson_id, sort_order);

create table public.resources (
  id           uuid primary key default gen_random_uuid(),
  lesson_id    uuid references public.lessons (id) on delete cascade,
  course_id    uuid references public.courses (id) on delete cascade,
  type         resource_type not null,
  title        text not null,
  description  text,
  url          text,
  storage_path text,
  file_size    bigint,
  mime_type    text,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint resources_one_parent check (num_nonnulls(lesson_id, course_id) = 1),
  constraint resources_one_source check (num_nonnulls(url, storage_path) = 1)
);
create index resources_lesson_idx on public.resources (lesson_id, sort_order);
create index resources_course_idx on public.resources (course_id, sort_order);

-- --- Horodatage ---------------------------------------------------------
drop trigger if exists levels_set_updated_at on public.levels;
create trigger levels_set_updated_at
  before update on public.levels    for each row execute function public.set_updated_at();
drop trigger if exists subjects_set_updated_at on public.subjects;
create trigger subjects_set_updated_at
  before update on public.subjects  for each row execute function public.set_updated_at();
drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at
  before update on public.courses   for each row execute function public.set_updated_at();
drop trigger if exists modules_set_updated_at on public.modules;
create trigger modules_set_updated_at
  before update on public.modules   for each row execute function public.set_updated_at();
drop trigger if exists chapters_set_updated_at on public.chapters;
create trigger chapters_set_updated_at
  before update on public.chapters  for each row execute function public.set_updated_at();
drop trigger if exists lessons_set_updated_at on public.lessons;
create trigger lessons_set_updated_at
  before update on public.lessons   for each row execute function public.set_updated_at();
drop trigger if exists videos_set_updated_at on public.videos;
create trigger videos_set_updated_at
  before update on public.videos    for each row execute function public.set_updated_at();
drop trigger if exists resources_set_updated_at on public.resources;
create trigger resources_set_updated_at
  before update on public.resources for each row execute function public.set_updated_at();

-- --- Dénormalisation pilotée par la base --------------------------------
-- course_id / module_id sont déduits du parent : l'application ne les fournit
-- jamais, la cohérence ne dépend donc pas de la discipline du développeur.

create or replace function public.sync_chapter_denorm()
returns trigger
language plpgsql
as $$
begin
  select m.course_id into new.course_id
  from public.modules m where m.id = new.module_id;
  return new;
end;
$$;

drop trigger if exists chapters_sync_denorm on public.chapters;
create trigger chapters_sync_denorm
  before insert or update of module_id on public.chapters
  for each row execute function public.sync_chapter_denorm();

create or replace function public.sync_lesson_denorm()
returns trigger
language plpgsql
as $$
begin
  select c.module_id, c.course_id into new.module_id, new.course_id
  from public.chapters c where c.id = new.chapter_id;
  return new;
end;
$$;

drop trigger if exists lessons_sync_denorm on public.lessons;
create trigger lessons_sync_denorm
  before insert or update of chapter_id on public.lessons
  for each row execute function public.sync_lesson_denorm();

-- Un module déplacé vers une autre formation entraîne ses chapitres et leçons.
create or replace function public.cascade_module_course()
returns trigger
language plpgsql
as $$
begin
  if new.course_id is distinct from old.course_id then
    update public.chapters set course_id = new.course_id where module_id = new.id;
    update public.lessons  set course_id = new.course_id where module_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists modules_cascade_course on public.modules;
create trigger modules_cascade_course
  after update of course_id on public.modules
  for each row execute function public.cascade_module_course();

-- --- Compteurs de formation ---------------------------------------------
create or replace function public.refresh_course_counters(p_course_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.courses c
  set lessons_count = coalesce(agg.lessons_count, 0),
      duration_seconds = coalesce(agg.duration_seconds, 0)
  from (
    select
      count(*) filter (where l.status = 'published') as lessons_count,
      coalesce(sum(
        case when l.status = 'published'
          then greatest(l.duration_seconds, coalesce(v.total, 0))
          else 0 end
      ), 0) as duration_seconds
    from public.lessons l
    left join lateral (
      select sum(duration_seconds) as total from public.videos where lesson_id = l.id
    ) v on true
    where l.course_id = p_course_id
  ) agg
  where c.id = p_course_id;
$$;

create or replace function public.trg_refresh_course_counters()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
begin
  if tg_table_name = 'lessons' then
    v_course_id := coalesce(new.course_id, old.course_id);
  else
    select l.course_id into v_course_id
    from public.lessons l
    where l.id = coalesce(new.lesson_id, old.lesson_id);
  end if;

  if v_course_id is not null then
    perform public.refresh_course_counters(v_course_id);
  end if;

  return null;
end;
$$;

drop trigger if exists lessons_refresh_counters on public.lessons;
create trigger lessons_refresh_counters
  after insert or update or delete on public.lessons
  for each row execute function public.trg_refresh_course_counters();

drop trigger if exists videos_refresh_counters on public.videos;
create trigger videos_refresh_counters
  after insert or update or delete on public.videos
  for each row execute function public.trg_refresh_course_counters();

-- ###########################################################################
-- ### 0004_assessments.sql
-- ###########################################################################

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

-- ###########################################################################
-- ### 0005_progress.sql
-- ###########################################################################

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

-- ###########################################################################
-- ### 0006_engagement.sql
-- ###########################################################################

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

-- ###########################################################################
-- ### 0007_access.sql
-- ###########################################################################

-- ===========================================================================
-- 0007 — Accès et codes d'activation
-- La formation est vendue hors plateforme ; l'accès se débloque par code.
-- ===========================================================================

create table public.access_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique,
  label       text,
  scope       access_scope not null default 'all',
  course_id   uuid references public.courses (id)  on delete cascade,
  subject_id  uuid references public.subjects (id) on delete cascade,
  max_uses    integer not null default 1 check (max_uses > 0),
  uses_count  integer not null default 0 check (uses_count >= 0),
  access_days integer check (access_days is null or access_days > 0),
  expires_at  timestamptz,
  is_active   boolean not null default true,
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint access_codes_uses check (uses_count <= max_uses),
  constraint access_codes_scope_target check (
    (scope = 'all'     and course_id is null and subject_id is null) or
    (scope = 'subject' and subject_id is not null and course_id is null) or
    (scope = 'course'  and course_id is not null and subject_id is null)
  )
);
create index access_codes_active_idx on public.access_codes (is_active, expires_at);

create table public.enrollments (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  scope      access_scope not null,
  course_id  uuid references public.courses (id)  on delete cascade,
  subject_id uuid references public.subjects (id) on delete cascade,
  source     text not null default 'code',
  granted_by uuid references public.profiles (id)     on delete set null,
  code_id    uuid references public.access_codes (id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  revoked_at timestamptz,
  constraint enrollments_scope_target check (
    (scope = 'all'     and course_id is null and subject_id is null) or
    (scope = 'subject' and subject_id is not null and course_id is null) or
    (scope = 'course'  and course_id is not null and subject_id is null)
  )
);
create index enrollments_user_idx on public.enrollments (user_id) where revoked_at is null;
create unique index enrollments_all_uidx     on public.enrollments (user_id)             where scope = 'all'     and revoked_at is null;
create unique index enrollments_course_uidx  on public.enrollments (user_id, course_id)  where scope = 'course'  and revoked_at is null;
create unique index enrollments_subject_uidx on public.enrollments (user_id, subject_id) where scope = 'subject' and revoked_at is null;

create table public.code_redemptions (
  id          uuid primary key default gen_random_uuid(),
  code_id     uuid not null references public.access_codes (id) on delete cascade,
  user_id     uuid not null references public.profiles (id)     on delete cascade,
  redeemed_at timestamptz not null default now(),
  unique (code_id, user_id)
);
create index code_redemptions_user_idx on public.code_redemptions (user_id);

-- ---------------------------------------------------------------------------
-- has_course_access — appelée par toutes les policies de contenu réservé.
-- STABLE : Postgres l'évalue une fois par requête, pas une fois par ligne.
-- ---------------------------------------------------------------------------
create or replace function public.has_course_access(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.is_staff()
    or exists (
      select 1
      from public.enrollments e
      left join public.courses c on c.id = p_course_id
      where e.user_id = auth.uid()
        and e.revoked_at is null
        and (e.expires_at is null or e.expires_at > now())
        and (
          e.scope = 'all'
          or (e.scope = 'course'  and e.course_id  = p_course_id)
          or (e.scope = 'subject' and e.subject_id = c.subject_id)
        )
    );
$$;

-- ---------------------------------------------------------------------------
-- get_lesson_content — le contenu textuel d'une leçon.
-- La LIGNE lessons reste lisible (pour afficher le programme avant achat),
-- mais la COLONNE content_md est révoquée : elle passe obligatoirement ici.
-- ---------------------------------------------------------------------------
create or replace function public.get_lesson_content(p_lesson_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_lesson record;
begin
  select l.content_md, l.course_id, l.is_free_preview, l.status
    into v_lesson
  from public.lessons l
  where l.id = p_lesson_id;

  if not found or v_lesson.status <> 'published' then
    raise exception 'Leçon introuvable' using errcode = 'no_data_found';
  end if;

  if not (v_lesson.is_free_preview or public.has_course_access(v_lesson.course_id)) then
    raise exception 'Accès non autorisé à cette leçon' using errcode = 'insufficient_privilege';
  end if;

  return v_lesson.content_md;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_access_code — le SEUL chemin de création d'une inscription.
-- Aucune policy INSERT n'existe sur enrollments pour l'utilisateur.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_access_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code    public.access_codes;
  v_expires timestamptz;
begin
  if v_user_id is null then
    return jsonb_build_object('ok', false, 'error', 'unauthenticated',
                              'message', 'Vous devez être connecté.');
  end if;

  -- Verrou de ligne : deux activations simultanées du dernier usage
  -- disponible ne peuvent pas passer toutes les deux.
  select * into v_code
  from public.access_codes
  where code = upper(trim(p_code))
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found',
                              'message', 'Ce code n''existe pas. Vérifiez la saisie.');
  end if;

  if not v_code.is_active then
    return jsonb_build_object('ok', false, 'error', 'inactive',
                              'message', 'Ce code a été désactivé.');
  end if;

  if v_code.expires_at is not null and v_code.expires_at <= now() then
    return jsonb_build_object('ok', false, 'error', 'expired',
                              'message', 'Ce code a expiré.');
  end if;

  if v_code.uses_count >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'error', 'exhausted',
                              'message', 'Ce code a déjà été utilisé au maximum.');
  end if;

  if exists (select 1 from public.code_redemptions
             where code_id = v_code.id and user_id = v_user_id) then
    return jsonb_build_object('ok', false, 'error', 'already_used',
                              'message', 'Vous avez déjà utilisé ce code.');
  end if;

  v_expires := case
    when v_code.access_days is null then null
    else now() + make_interval(days => v_code.access_days)
  end;

  insert into public.enrollments
    (user_id, scope, course_id, subject_id, source, code_id, expires_at)
  values
    (v_user_id, v_code.scope, v_code.course_id, v_code.subject_id, 'code', v_code.id, v_expires)
  on conflict do nothing;

  insert into public.code_redemptions (code_id, user_id) values (v_code.id, v_user_id);

  update public.access_codes set uses_count = uses_count + 1 where id = v_code.id;

  insert into public.notifications (user_id, type, title, body, link_url)
  values (v_user_id, 'system', 'Accès activé',
          'Votre accès a bien été activé. Bonne formation !', '/dashboard');

  return jsonb_build_object(
    'ok', true,
    'scope', v_code.scope,
    'course_id', v_code.course_id,
    'subject_id', v_code.subject_id,
    'expires_at', v_expires,
    'message', 'Accès activé.'
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- generate_access_codes — génération en lot depuis l'administration.
-- Alphabet sans caractères ambigus (ni O/0, ni I/1).
-- ---------------------------------------------------------------------------
create or replace function public.generate_access_codes(
  p_count       integer,
  p_scope       access_scope default 'all',
  p_course_id   uuid    default null,
  p_subject_id  uuid    default null,
  p_max_uses    integer default 1,
  p_access_days integer default null,
  p_label       text    default null
)
returns setof public.access_codes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i integer;
  j integer;
begin
  if not public.is_admin() then
    raise exception 'Réservé aux administrateurs' using errcode = 'insufficient_privilege';
  end if;

  if p_count is null or p_count < 1 or p_count > 500 then
    raise exception 'Nombre de codes invalide (1 à 500)';
  end if;

  for i in 1 .. p_count loop
    loop
      v_code := '';
      for j in 1 .. 12 loop
        if j in (5, 9) then
          v_code := v_code || '-';
        end if;
        v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
      end loop;
      exit when not exists (select 1 from public.access_codes where code = v_code);
    end loop;

    return query
      insert into public.access_codes
        (code, label, scope, course_id, subject_id, max_uses, access_days, created_by)
      values
        (v_code, p_label, p_scope, p_course_id, p_subject_id, p_max_uses, p_access_days, auth.uid())
      returning *;
  end loop;
end;
$$;

-- ###########################################################################
-- ### 0008_functions.sql
-- ###########################################################################

-- ===========================================================================
-- 0008 — Logique métier : progression, XP, badges, objectifs, quiz, tri
-- Tout ce qui touche à un score, à de l'XP ou à un accès passe ici en
-- SECURITY DEFINER. Aucune de ces tables n'est écrite directement par le client.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- XP — journal d'événements + cache sur profiles
-- ---------------------------------------------------------------------------
create or replace function public.award_xp(
  p_user_id      uuid,
  p_amount       integer,
  p_reason       xp_reason,
  p_source_table text default null,
  p_source_id    uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  -- L'index unique partiel rend l'opération idempotente : une même leçon ne
  -- peut jamais rapporter deux fois son XP.
  insert into public.xp_events (user_id, amount, reason, source_table, source_id)
  values (p_user_id, p_amount, p_reason, p_source_table, p_source_id)
  on conflict do nothing;

  if not found then
    return false;
  end if;

  perform set_config('app.privileged', 'on', true);
  update public.profiles set xp = xp + p_amount where id = p_user_id;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Série de jours consécutifs
-- ---------------------------------------------------------------------------
create or replace function public.touch_streak(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile record;
  v_today   date;
  v_next    integer;
begin
  select last_activity_date, streak_current, streak_longest, timezone
    into v_profile
  from public.profiles where id = p_user_id;

  if not found then
    return;
  end if;

  v_today := (now() at time zone coalesce(v_profile.timezone, 'Europe/Paris'))::date;

  if v_profile.last_activity_date = v_today then
    return;
  end if;

  v_next := case
    when v_profile.last_activity_date = v_today - 1 then v_profile.streak_current + 1
    else 1
  end;

  perform set_config('app.privileged', 'on', true);
  update public.profiles
  set streak_current     = v_next,
      streak_longest     = greatest(streak_longest, v_next),
      last_activity_date = v_today
  where id = p_user_id;

  if v_next > 0 and v_next % 7 = 0 then
    perform public.award_xp(p_user_id, 50, 'streak_bonus', 'streak', null);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Progression d'une formation — cache recalculé par trigger
-- ---------------------------------------------------------------------------
create or replace function public.recalc_course_progress(p_user_id uuid, p_course_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total  integer;
  v_done   integer;
  v_pct    numeric(5, 2);
  v_last   uuid;
  v_status progress_status;
begin
  select count(*) into v_total
  from public.lessons where course_id = p_course_id and status = 'published';

  select count(*) into v_done
  from public.lesson_progress lp
  join public.lessons l on l.id = lp.lesson_id and l.status = 'published'
  where lp.user_id = p_user_id and lp.course_id = p_course_id and lp.status = 'completed';

  v_pct := case when v_total = 0 then 0
                else round(v_done::numeric * 100 / v_total, 2) end;

  select lp.lesson_id into v_last
  from public.lesson_progress lp
  where lp.user_id = p_user_id and lp.course_id = p_course_id
  order by lp.last_viewed_at desc
  limit 1;

  v_status := case when v_total > 0 and v_done >= v_total then 'completed'
                   else 'in_progress' end;

  insert into public.course_progress
    (user_id, course_id, lessons_completed, lessons_total, percent, status,
     last_lesson_id, last_activity_at, completed_at)
  values
    (p_user_id, p_course_id, v_done, v_total, v_pct, v_status, v_last, now(),
     case when v_status = 'completed' then now() end)
  on conflict (user_id, course_id) do update set
    lessons_completed = excluded.lessons_completed,
    lessons_total     = excluded.lessons_total,
    percent           = excluded.percent,
    status            = excluded.status,
    last_lesson_id    = coalesce(excluded.last_lesson_id, course_progress.last_lesson_id),
    last_activity_at  = now(),
    completed_at      = case
      when excluded.status = 'completed' and course_progress.completed_at is null then now()
      when excluded.status <> 'completed' then null
      else course_progress.completed_at
    end;

  if v_status = 'completed' then
    if public.award_xp(p_user_id, 200, 'course_completed', 'courses', p_course_id) then
      insert into public.notifications (user_id, type, title, body, link_url)
      select p_user_id, 'system', 'Formation terminée',
             'Bravo, vous avez terminé « ' || c.title ||' ».',
             '/courses/' || c.slug
      from public.courses c where c.id = p_course_id;
    end if;
  end if;
end;
$$;

create or replace function public.trg_recalc_course_progress()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_course_progress(
    coalesce(new.user_id, old.user_id),
    coalesce(new.course_id, old.course_id)
  );
  return null;
end;
$$;

drop trigger if exists lesson_progress_recalc on public.lesson_progress;
create trigger lesson_progress_recalc
  after insert or update or delete on public.lesson_progress
  for each row execute function public.trg_recalc_course_progress();

-- ---------------------------------------------------------------------------
-- Objectifs — période courante recalculée depuis les faits
-- ---------------------------------------------------------------------------
create or replace function public.record_goal_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_goal    record;
  v_tz      text;
  v_today   date;
  v_start   date;
  v_end     date;
  v_value   integer;
  v_achieved boolean;
  v_was     boolean;
begin
  select coalesce(timezone, 'Europe/Paris') into v_tz from public.profiles where id = p_user_id;
  v_today := (now() at time zone v_tz)::date;

  for v_goal in
    select * from public.goals where user_id = p_user_id and is_active
  loop
    if v_goal.type in ('daily_minutes', 'daily_lessons') then
      v_start := v_today;
      v_end   := v_today;
    else
      v_start := date_trunc('week', v_today)::date;
      v_end   := v_start + 6;
    end if;

    if v_goal.type in ('daily_minutes', 'weekly_minutes') then
      select coalesce(sum(duration_seconds), 0) / 60 into v_value
      from public.study_sessions
      where user_id = p_user_id
        and (started_at at time zone v_tz)::date between v_start and v_end;
    else
      select count(*) into v_value
      from public.lesson_progress
      where user_id = p_user_id
        and status = 'completed'
        and (completed_at at time zone v_tz)::date between v_start and v_end;
    end if;

    v_achieved := v_value >= v_goal.target_value;

    select achieved into v_was
    from public.goal_periods
    where goal_id = v_goal.id and period_start = v_start;

    insert into public.goal_periods
      (goal_id, user_id, period_start, period_end, achieved_value, target_value, achieved)
    values
      (v_goal.id, p_user_id, v_start, v_end, v_value, v_goal.target_value, v_achieved)
    on conflict (goal_id, period_start) do update set
      achieved_value = excluded.achieved_value,
      target_value   = excluded.target_value,
      achieved       = excluded.achieved;

    -- Notification au franchissement uniquement, jamais à chaque mise à jour.
    if v_achieved and not coalesce(v_was, false) then
      perform public.award_xp(p_user_id, 30, 'goal_reached', 'goal_periods', v_goal.id);
      insert into public.notifications (user_id, type, title, body, link_url)
      select p_user_id, 'goal_reached', 'Objectif atteint',
             'Vous avez atteint votre objectif : ' || v_goal.target_value ||
             case when v_goal.type like '%minutes' then ' minutes.' else ' leçons.' end,
             '/goals'
      where exists (
        select 1 from public.notification_preferences np
        where np.user_id = p_user_id and np.goal_reached
      );
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Badges — critères déclaratifs stockés en JSON
-- ---------------------------------------------------------------------------
create or replace function public.check_badges(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_badge   record;
  v_ok      boolean;
  v_value   integer;
  v_awarded integer := 0;
begin
  for v_badge in
    select b.* from public.badges b
    where b.is_active
      and not exists (
        select 1 from public.user_badges ub
        where ub.user_id = p_user_id and ub.badge_id = b.id
      )
  loop
    v_ok := false;

    case v_badge.criteria ->> 'type'
      when 'lessons_completed' then
        select count(*) into v_value from public.lesson_progress
        where user_id = p_user_id and status = 'completed';
        v_ok := v_value >= (v_badge.criteria ->> 'value')::int;

      when 'courses_completed' then
        select count(*) into v_value from public.course_progress
        where user_id = p_user_id and status = 'completed';
        v_ok := v_value >= (v_badge.criteria ->> 'value')::int;

      when 'streak_days' then
        select streak_longest into v_value from public.profiles where id = p_user_id;
        v_ok := coalesce(v_value, 0) >= (v_badge.criteria ->> 'value')::int;

      when 'quizzes_passed' then
        select count(distinct quiz_id) into v_value from public.quiz_attempts
        where user_id = p_user_id and passed;
        v_ok := v_value >= (v_badge.criteria ->> 'value')::int;

      when 'perfect_quiz' then
        select count(*) into v_value from public.quiz_attempts
        where user_id = p_user_id and percentage >= 100;
        v_ok := v_value >= (v_badge.criteria ->> 'value')::int;

      when 'subject_completed' then
        -- Toutes les formations publiées du domaine sont terminées
        select not exists (
          select 1
          from public.courses c
          join public.subjects s on s.id = c.subject_id
          left join public.course_progress cp
            on cp.course_id = c.id and cp.user_id = p_user_id
          where c.status = 'published'
            and s.slug = (v_badge.criteria ->> 'subject')
            and coalesce(cp.status, 'not_started') <> 'completed'
        ) and exists (
          select 1 from public.courses c
          join public.subjects s on s.id = c.subject_id
          where c.status = 'published' and s.slug = (v_badge.criteria ->> 'subject')
        )
        into v_ok;

      when 'all_courses_completed' then
        select not exists (
          select 1
          from public.courses c
          left join public.course_progress cp
            on cp.course_id = c.id and cp.user_id = p_user_id
          where c.status = 'published'
            and coalesce(cp.status, 'not_started') <> 'completed'
        ) and exists (select 1 from public.courses where status = 'published')
        into v_ok;

      else
        v_ok := false;
    end case;

    if v_ok then
      insert into public.user_badges (user_id, badge_id)
      values (p_user_id, v_badge.id)
      on conflict do nothing;

      if found then
        v_awarded := v_awarded + 1;

        if v_badge.xp_reward > 0 then
          perform public.award_xp(p_user_id, v_badge.xp_reward, 'badge_earned', 'badges', v_badge.id);
        end if;

        insert into public.notifications (user_id, type, title, body, link_url)
        select p_user_id, 'badge_earned', 'Nouveau badge : ' || v_badge.name,
               v_badge.description, '/profile'
        where exists (
          select 1 from public.notification_preferences np
          where np.user_id = p_user_id and np.badge_earned
        );
      end if;
    end if;
  end loop;

  return v_awarded;
end;
$$;

-- ---------------------------------------------------------------------------
-- Achèvement d'une leçon
-- ---------------------------------------------------------------------------
create or replace function public.complete_lesson_internal(
  p_user_id   uuid,
  p_lesson_id uuid,
  p_course_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.lesson_progress
    (user_id, lesson_id, course_id, status, completed_at, last_viewed_at)
  values
    (p_user_id, p_lesson_id, p_course_id, 'completed', now(), now())
  on conflict (user_id, lesson_id) do update set
    status         = 'completed',
    completed_at   = coalesce(lesson_progress.completed_at, now()),
    last_viewed_at = now();

  perform public.award_xp(p_user_id, 25, 'lesson_completed', 'lessons', p_lesson_id);
  perform public.touch_streak(p_user_id);
  perform public.record_goal_progress(p_user_id);
  perform public.check_badges(p_user_id);
end;
$$;

create or replace function public.set_lesson_completed(p_lesson_id uuid, p_completed boolean default true)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user   uuid := auth.uid();
  v_lesson record;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'insufficient_privilege';
  end if;

  select l.course_id, l.is_free_preview into v_lesson
  from public.lessons l where l.id = p_lesson_id and l.status = 'published';

  if not found then
    raise exception 'Leçon introuvable' using errcode = 'no_data_found';
  end if;

  if not (v_lesson.is_free_preview or public.has_course_access(v_lesson.course_id)) then
    raise exception 'Accès non autorisé' using errcode = 'insufficient_privilege';
  end if;

  if p_completed then
    perform public.complete_lesson_internal(v_user, p_lesson_id, v_lesson.course_id);
  else
    update public.lesson_progress
    set status = 'in_progress', completed_at = null, last_viewed_at = now()
    where user_id = v_user and lesson_id = p_lesson_id;
  end if;

  return jsonb_build_object('ok', true, 'completed', p_completed);
end;
$$;

-- ---------------------------------------------------------------------------
-- Progression vidéo — appelée toutes les 10 s par le lecteur
-- ---------------------------------------------------------------------------
create or replace function public.upsert_video_progress(
  p_video_id uuid,
  p_position integer,
  p_watched  integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_video    record;
  v_pct      numeric(5, 2);
  v_complete boolean;
  v_all_done boolean;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'insufficient_privilege';
  end if;

  select v.lesson_id, v.duration_seconds, l.course_id, l.is_free_preview
    into v_video
  from public.videos v
  join public.lessons l on l.id = v.lesson_id
  where v.id = p_video_id and l.status = 'published';

  if not found then
    raise exception 'Vidéo introuvable' using errcode = 'no_data_found';
  end if;

  if not (v_video.is_free_preview or public.has_course_access(v_video.course_id)) then
    raise exception 'Accès non autorisé' using errcode = 'insufficient_privilege';
  end if;

  v_pct := case when v_video.duration_seconds > 0
    then least(100, round(greatest(p_position, 0)::numeric * 100 / v_video.duration_seconds, 2))
    else 0 end;
  v_complete := v_pct >= 90;

  insert into public.video_progress
    (user_id, video_id, lesson_id, position_seconds, watched_seconds,
     duration_seconds, percent, completed, last_watched_at)
  values
    (v_user, p_video_id, v_video.lesson_id, greatest(p_position, 0), greatest(p_watched, 0),
     v_video.duration_seconds, v_pct, v_complete, now())
  on conflict (user_id, video_id) do update set
    position_seconds = greatest(excluded.position_seconds, 0),
    watched_seconds  = greatest(video_progress.watched_seconds, excluded.watched_seconds),
    duration_seconds = excluded.duration_seconds,
    -- percent conserve le point le plus avancé atteint, pas la position courante
    percent          = greatest(video_progress.percent, excluded.percent),
    completed        = video_progress.completed or excluded.completed,
    last_watched_at  = now();

  insert into public.lesson_progress (user_id, lesson_id, course_id, status, last_viewed_at)
  values (v_user, v_video.lesson_id, v_video.course_id, 'in_progress', now())
  on conflict (user_id, lesson_id) do update set
    last_viewed_at = now(),
    -- Le CASE doit être explicitement typé : sans cast, les littéraux sont
    -- résolus en text et Postgres refuse l'affectation à une colonne enum.
    status = case when lesson_progress.status = 'completed'
                  then 'completed'::progress_status
                  else 'in_progress'::progress_status end;

  -- Une leçon se termine automatiquement quand toutes ses vidéos sont vues.
  if v_complete then
    select bool_and(coalesce(vp.completed, false)) into v_all_done
    from public.videos vv
    left join public.video_progress vp on vp.video_id = vv.id and vp.user_id = v_user
    where vv.lesson_id = v_video.lesson_id;

    if coalesce(v_all_done, false) then
      perform public.complete_lesson_internal(v_user, v_video.lesson_id, v_video.course_id);
    end if;
  end if;

  return jsonb_build_object('ok', true, 'percent', v_pct, 'completed', v_complete);
end;
$$;

-- ---------------------------------------------------------------------------
-- Temps d'étude
-- ---------------------------------------------------------------------------
create or replace function public.record_study_time(
  p_seconds   integer,
  p_course_id uuid default null,
  p_lesson_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null or p_seconds is null or p_seconds <= 0 then
    return;
  end if;

  -- Garde-fou : un appel ne peut pas déclarer plus de 30 minutes d'un coup.
  insert into public.study_sessions
    (user_id, course_id, lesson_id, started_at, ended_at, duration_seconds)
  values
    (v_user, p_course_id, p_lesson_id,
     now() - make_interval(secs => least(p_seconds, 1800)), now(), least(p_seconds, 1800));

  perform public.touch_streak(v_user);
  perform public.record_goal_progress(v_user);
end;
$$;

-- ---------------------------------------------------------------------------
-- Correction des quiz — côté serveur exclusivement
-- p_responses : [{"question_id": uuid, "answer_ids": [uuid], "text": "…"}]
-- ---------------------------------------------------------------------------
create or replace function public.submit_quiz_attempt(p_quiz_id uuid, p_responses jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user       uuid := auth.uid();
  v_quiz       record;
  v_attempt_no integer;
  v_attempt_id uuid;
  v_question   record;
  v_response   jsonb;
  v_selected   uuid[];
  v_text       text;
  v_correct    uuid[];
  v_is_correct boolean;
  v_points     numeric(6, 2);
  v_score      numeric(7, 2) := 0;
  v_max        numeric(7, 2) := 0;
  v_pct        numeric(5, 2);
  v_passed     boolean;
  v_details    jsonb := '[]'::jsonb;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'insufficient_privilege';
  end if;

  select q.id, q.course_id, q.passing_score, q.max_attempts, q.show_explanations, q.title
    into v_quiz
  from public.quizzes q
  where q.id = p_quiz_id and q.status = 'published';

  if not found then
    raise exception 'Quiz introuvable' using errcode = 'no_data_found';
  end if;

  if not public.has_course_access(v_quiz.course_id) then
    raise exception 'Accès non autorisé' using errcode = 'insufficient_privilege';
  end if;

  select coalesce(max(attempt_number), 0) + 1 into v_attempt_no
  from public.quiz_attempts where user_id = v_user and quiz_id = p_quiz_id;

  if v_quiz.max_attempts is not null and v_attempt_no > v_quiz.max_attempts then
    raise exception 'Nombre de tentatives dépassé' using errcode = 'check_violation';
  end if;

  insert into public.quiz_attempts (user_id, quiz_id, attempt_number, submitted_at)
  values (v_user, p_quiz_id, v_attempt_no, now())
  returning id into v_attempt_id;

  for v_question in
    select * from public.questions where quiz_id = p_quiz_id order by sort_order, created_at
  loop
    v_max := v_max + v_question.points;

    select r into v_response
    from jsonb_array_elements(coalesce(p_responses, '[]'::jsonb)) r
    where r ->> 'question_id' = v_question.id::text
    limit 1;

    v_selected := coalesce(
      (select array_agg((value #>> '{}')::uuid)
       from jsonb_array_elements(coalesce(v_response -> 'answer_ids', '[]'::jsonb))),
      '{}'::uuid[]
    );
    v_text := v_response ->> 'text';

    if v_question.type = 'short_answer' then
      v_is_correct := exists (
        select 1 from public.answers a
        where a.question_id = v_question.id
          and a.is_correct
          and public.normalize_text(coalesce(a.match_pattern, a.label))
              = public.normalize_text(coalesce(v_text, ''))
      ) and coalesce(trim(v_text), '') <> '';
    else
      select coalesce(array_agg(a.id order by a.id), '{}'::uuid[]) into v_correct
      from public.answers a where a.question_id = v_question.id and a.is_correct;

      -- Égalité stricte des ensembles : ni oubli, ni réponse en trop.
      v_is_correct := (
        select coalesce(array_agg(distinct x order by x), '{}'::uuid[])
        from unnest(v_selected) x
      ) = v_correct and array_length(v_correct, 1) is not null;
    end if;

    v_points := case when v_is_correct then v_question.points else 0 end;
    v_score  := v_score + v_points;

    insert into public.quiz_attempt_answers
      (attempt_id, question_id, selected_answer_ids, text_answer, is_correct, points_awarded)
    values
      (v_attempt_id, v_question.id, v_selected, v_text, v_is_correct, v_points);

    v_details := v_details || jsonb_build_object(
      'question_id', v_question.id,
      'is_correct',  v_is_correct,
      'points',      v_points,
      'explanation', case when v_quiz.show_explanations then v_question.explanation end,
      'correct_answer_ids', coalesce(
        (select jsonb_agg(a.id) from public.answers a
         where a.question_id = v_question.id and a.is_correct), '[]'::jsonb),
      'correct_labels', coalesce(
        (select jsonb_agg(a.label) from public.answers a
         where a.question_id = v_question.id and a.is_correct), '[]'::jsonb)
    );
  end loop;

  v_pct    := case when v_max > 0 then round(v_score * 100 / v_max, 2) else 0 end;
  v_passed := v_pct >= v_quiz.passing_score;

  update public.quiz_attempts
  set score = v_score, max_score = v_max, percentage = v_pct, passed = v_passed,
      duration_seconds = extract(epoch from (now() - started_at))::int
  where id = v_attempt_id;

  if v_passed then
    perform public.award_xp(v_user, 40, 'quiz_passed', 'quizzes', p_quiz_id);
  end if;

  perform public.touch_streak(v_user);
  perform public.check_badges(v_user);

  return jsonb_build_object(
    'ok', true,
    'attempt_id', v_attempt_id,
    'attempt_number', v_attempt_no,
    'score', v_score,
    'max_score', v_max,
    'percentage', v_pct,
    'passed', v_passed,
    'passing_score', v_quiz.passing_score,
    'details', v_details
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Réordonnancement (glisser-déposer de l'administration)
-- Liste blanche stricte : aucune injection possible via p_entity.
-- ---------------------------------------------------------------------------
create or replace function public.reorder_entities(
  p_entity      text,
  p_parent_id   uuid,
  p_ordered_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_table  text;
  v_parent text;
begin
  if not public.is_staff() then
    raise exception 'Réservé au staff' using errcode = 'insufficient_privilege';
  end if;

  case p_entity
    when 'levels'    then v_table := 'levels';    v_parent := null;
    when 'subjects'  then v_table := 'subjects';  v_parent := null;
    when 'courses'   then v_table := 'courses';   v_parent := 'subject_id';
    when 'modules'   then v_table := 'modules';   v_parent := 'course_id';
    when 'chapters'  then v_table := 'chapters';  v_parent := 'module_id';
    when 'lessons'   then v_table := 'lessons';   v_parent := 'chapter_id';
    when 'videos'    then v_table := 'videos';    v_parent := 'lesson_id';
    when 'resources' then v_table := 'resources'; v_parent := 'lesson_id';
    when 'quizzes'   then v_table := 'quizzes';   v_parent := 'lesson_id';
    when 'questions' then v_table := 'questions'; v_parent := 'quiz_id';
    when 'answers'   then v_table := 'answers';   v_parent := 'question_id';
    when 'exercises' then v_table := 'exercises'; v_parent := 'lesson_id';
    else raise exception 'Entité non réordonnable : %', p_entity;
  end case;

  if v_parent is null then
    execute format(
      'update public.%I t
          set sort_order = o.ord - 1
         from unnest($1) with ordinality as o(id, ord)
        where t.id = o.id',
      v_table
    ) using p_ordered_ids;
  else
    execute format(
      'update public.%I t
          set sort_order = o.ord - 1
         from unnest($1) with ordinality as o(id, ord)
        where t.id = o.id and t.%I = $2',
      v_table, v_parent
    ) using p_ordered_ids, p_parent_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Correction d'un exercice numérique.
-- expected_answer et tolerance sont révoqués en lecture directe (0009) : la
-- comparaison ne peut se faire qu'ici. Renvoie null si l'exercice n'est pas
-- de type numérique — la correction reste alors manuelle.
-- ---------------------------------------------------------------------------
create or replace function public.grade_numeric_exercise(p_exercise_id uuid, p_response text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_exercise record;
  v_expected numeric;
  v_given    numeric;
begin
  select e.kind, e.expected_answer, e.tolerance, e.status, l.course_id, l.is_free_preview
    into v_exercise
  from public.exercises e
  join public.lessons l on l.id = e.lesson_id
  where e.id = p_exercise_id;

  if not found or v_exercise.status <> 'published' then
    return null;
  end if;

  if not (v_exercise.is_free_preview or public.has_course_access(v_exercise.course_id)) then
    raise exception 'Accès non autorisé' using errcode = 'insufficient_privilege';
  end if;

  if v_exercise.kind <> 'numeric' or v_exercise.expected_answer is null then
    return null;
  end if;

  begin
    v_expected := replace(trim(v_exercise.expected_answer), ',', '.')::numeric;
    v_given    := replace(trim(p_response), ',', '.')::numeric;
  exception when others then
    return false;   -- réponse non numérique
  end;

  return abs(v_given - v_expected) <= coalesce(v_exercise.tolerance, 0);
end;
$$;

-- ---------------------------------------------------------------------------
-- Lecture des colonnes sensibles par le staff.
--
-- Le rôle `authenticated` couvre aussi bien les membres que les formateurs et
-- les administrateurs : les privilèges de colonne (0009) s'appliquent donc à
-- tout le monde. Ces fonctions rétablissent l'accès pour le staff uniquement,
-- de façon explicite et auditable — plutôt que d'ouvrir la colonne à tous.
-- ---------------------------------------------------------------------------
create or replace function public.staff_get_answers(p_question_ids uuid[])
returns table (
  id            uuid,
  question_id   uuid,
  label         text,
  is_correct    boolean,
  match_pattern text,
  sort_order    integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_staff() then
    raise exception 'Réservé au staff' using errcode = 'insufficient_privilege';
  end if;

  return query
    select a.id, a.question_id, a.label, a.is_correct, a.match_pattern, a.sort_order
    from public.answers a
    where a.question_id = any(p_question_ids)
    order by a.sort_order;
end;
$$;

create or replace function public.staff_get_exercise_solution(p_exercise_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_row record;
begin
  if not public.is_staff() then
    raise exception 'Réservé au staff' using errcode = 'insufficient_privilege';
  end if;

  select expected_answer, tolerance, solution_md into v_row
  from public.exercises where id = p_exercise_id;

  return jsonb_build_object(
    'expected_answer', v_row.expected_answer,
    'tolerance', v_row.tolerance,
    'solution_md', v_row.solution_md
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Soumission d'un exercice.
--
-- Même principe que les quiz : le corrigé n'est pas lisible avant d'avoir
-- répondu. La colonne solution_md est révoquée (0009) et n'est renvoyée qu'ici,
-- après enregistrement de la tentative.
-- ---------------------------------------------------------------------------
create or replace function public.submit_exercise_attempt(
  p_exercise_id     uuid,
  p_response        text default null,
  p_self_assessment smallint default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user     uuid := auth.uid();
  v_exercise record;
  v_correct  boolean := null;
  v_expected numeric;
  v_given    numeric;
begin
  if v_user is null then
    raise exception 'Non authentifié' using errcode = 'insufficient_privilege';
  end if;

  select e.kind, e.expected_answer, e.tolerance, e.solution_md, e.explanation_md,
         e.status, l.course_id, l.is_free_preview
    into v_exercise
  from public.exercises e
  join public.lessons l on l.id = e.lesson_id
  where e.id = p_exercise_id;

  if not found or v_exercise.status <> 'published' then
    raise exception 'Exercice introuvable' using errcode = 'no_data_found';
  end if;

  if not (v_exercise.is_free_preview or public.has_course_access(v_exercise.course_id)) then
    raise exception 'Accès non autorisé' using errcode = 'insufficient_privilege';
  end if;

  -- Correction automatique uniquement pour les réponses numériques.
  if v_exercise.kind = 'numeric' and v_exercise.expected_answer is not null then
    begin
      v_expected := replace(trim(v_exercise.expected_answer), ',', '.')::numeric;
      v_given    := replace(trim(coalesce(p_response, '')), ',', '.')::numeric;
      v_correct  := abs(v_given - v_expected) <= coalesce(v_exercise.tolerance, 0);
    exception when others then
      v_correct := false;   -- réponse non numérique
    end;
  end if;

  insert into public.exercise_attempts
    (user_id, exercise_id, response_text, is_correct, self_assessment)
  values (v_user, p_exercise_id, p_response, v_correct, p_self_assessment);

  perform public.touch_streak(v_user);

  return jsonb_build_object(
    'ok', true,
    'is_correct', v_correct,
    'solution_md', v_exercise.solution_md,
    'explanation_md', v_exercise.explanation_md
  );
end;
$$;

-- ###########################################################################
-- ### 0009_rls.sql
-- ###########################################################################

-- ===========================================================================
-- 0009 — Row Level Security
-- RLS activée sur TOUTES les tables. Aucune n'est laissée ouverte.
-- ===========================================================================

alter table public.profiles                 enable row level security;
alter table public.levels                   enable row level security;
alter table public.subjects                 enable row level security;
alter table public.level_subjects           enable row level security;
alter table public.courses                  enable row level security;
alter table public.modules                  enable row level security;
alter table public.chapters                 enable row level security;
alter table public.lessons                  enable row level security;
alter table public.videos                   enable row level security;
alter table public.resources                enable row level security;
alter table public.quizzes                  enable row level security;
alter table public.questions                enable row level security;
alter table public.answers                  enable row level security;
alter table public.quiz_attempts            enable row level security;
alter table public.quiz_attempt_answers     enable row level security;
alter table public.exercises                enable row level security;
alter table public.exercise_attempts        enable row level security;
alter table public.video_progress           enable row level security;
alter table public.lesson_progress          enable row level security;
alter table public.course_progress          enable row level security;
alter table public.study_sessions           enable row level security;
alter table public.notes                    enable row level security;
alter table public.favorites                enable row level security;
alter table public.badges                   enable row level security;
alter table public.user_badges              enable row level security;
alter table public.xp_events                enable row level security;
alter table public.goals                    enable row level security;
alter table public.goal_periods             enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.user_subject_interests   enable row level security;
alter table public.enrollments              enable row level security;
alter table public.access_codes             enable row level security;
alter table public.code_redemptions         enable row level security;

-- ===========================================================================
-- PROFILS
-- is_staff() est SECURITY DEFINER : aucune récursion de policy sur profiles.
-- ===========================================================================
drop policy if exists profiles_select_own   on public.profiles;
create policy profiles_select_own   on public.profiles for select using (id = auth.uid());
drop policy if exists profiles_select_staff on public.profiles;
create policy profiles_select_staff on public.profiles for select using (public.is_staff());
drop policy if exists profiles_update_own   on public.profiles;
create policy profiles_update_own   on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
drop policy if exists profiles_admin_all    on public.profiles;
create policy profiles_admin_all    on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- CONTENU — NIVEAU 1 : structure publique (catalogue, programme, SEO)
-- ===========================================================================
drop policy if exists levels_select   on public.levels;
create policy levels_select   on public.levels   for select using (status = 'published');
drop policy if exists levels_staff    on public.levels;
create policy levels_staff    on public.levels   for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists subjects_select on public.subjects;
create policy subjects_select on public.subjects for select using (status = 'published');
drop policy if exists subjects_staff  on public.subjects;
create policy subjects_staff  on public.subjects for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists level_subjects_select on public.level_subjects;
create policy level_subjects_select on public.level_subjects for select using (true);
drop policy if exists level_subjects_staff  on public.level_subjects;
create policy level_subjects_staff  on public.level_subjects for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists courses_select on public.courses;
create policy courses_select on public.courses for select using (status = 'published');
drop policy if exists courses_staff  on public.courses;
create policy courses_staff  on public.courses for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists modules_select on public.modules;
create policy modules_select on public.modules for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = modules.course_id and c.status = 'published')
);
drop policy if exists modules_staff on public.modules;
create policy modules_staff on public.modules for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists chapters_select on public.chapters;
create policy chapters_select on public.chapters for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = chapters.course_id and c.status = 'published')
);
drop policy if exists chapters_staff on public.chapters;
create policy chapters_staff on public.chapters for all using (public.is_staff()) with check (public.is_staff());

-- La LIGNE d'une leçon reste lisible : c'est le programme, l'argument de vente.
-- La COLONNE content_md est révoquée plus bas et passe par get_lesson_content().
drop policy if exists lessons_select on public.lessons;
create policy lessons_select on public.lessons for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
);
drop policy if exists lessons_staff on public.lessons;
create policy lessons_staff on public.lessons for all using (public.is_staff()) with check (public.is_staff());

-- ===========================================================================
-- CONTENU — NIVEAU 2 : réservé aux membres ayant un accès valide
-- ===========================================================================
drop policy if exists videos_select on public.videos;
create policy videos_select on public.videos for select using (
  exists (
    select 1 from public.lessons l
    where l.id = videos.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
drop policy if exists videos_staff on public.videos;
create policy videos_staff on public.videos for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists resources_select on public.resources;
create policy resources_select on public.resources for select using (
  (resources.course_id is not null and public.has_course_access(resources.course_id))
  or exists (
    select 1 from public.lessons l
    where l.id = resources.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
drop policy if exists resources_staff on public.resources;
create policy resources_staff on public.resources for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists quizzes_select on public.quizzes;
create policy quizzes_select on public.quizzes for select using (
  status = 'published' and public.has_course_access(quizzes.course_id)
);
drop policy if exists quizzes_staff on public.quizzes;
create policy quizzes_staff on public.quizzes for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists questions_select on public.questions;
create policy questions_select on public.questions for select using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id
      and q.status = 'published'
      and public.has_course_access(q.course_id)
  )
);
drop policy if exists questions_staff on public.questions;
create policy questions_staff on public.questions for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists answers_select on public.answers;
create policy answers_select on public.answers for select using (
  exists (
    select 1 from public.questions qu
    join public.quizzes q on q.id = qu.quiz_id
    where qu.id = answers.question_id
      and q.status = 'published'
      and public.has_course_access(q.course_id)
  )
);
drop policy if exists answers_staff on public.answers;
create policy answers_staff on public.answers for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists exercises_select on public.exercises;
create policy exercises_select on public.exercises for select using (
  status = 'published'
  and exists (
    select 1 from public.lessons l
    where l.id = exercises.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
drop policy if exists exercises_staff on public.exercises;
create policy exercises_staff on public.exercises for all using (public.is_staff()) with check (public.is_staff());

-- ===========================================================================
-- PRIVILÈGES DE COLONNE
--
-- La RLS filtre les LIGNES ; seuls les GRANT filtrent les COLONNES.
--
-- POINT CRITIQUE : en PostgreSQL, révoquer une colonne alors qu'un privilège
-- existe AU NIVEAU TABLE ne produit aucun effet — le privilège de table
-- l'emporte. Or Supabase accorde `ALL` sur toutes les tables de `public` aux
-- rôles anon et authenticated. Un simple
--     revoke select (content_md) on lessons from authenticated
-- serait donc silencieusement inopérant.
--
-- La seule méthode qui fonctionne : révoquer SELECT au niveau table, puis
-- ré-accorder explicitement les colonnes autorisées.
-- ===========================================================================

-- --- lessons : tout sauf content_md ---------------------------------------
revoke select on public.lessons from anon, authenticated;
grant select (
  id, chapter_id, module_id, course_id, slug, title, description,
  duration_seconds, sort_order, is_free_preview, status, created_at, updated_at
) on public.lessons to anon, authenticated;

-- --- answers : tout sauf is_correct et match_pattern -----------------------
revoke select on public.answers from anon, authenticated;
grant select (id, question_id, label, sort_order, created_at)
  on public.answers to anon, authenticated;

-- --- exercises : tout sauf la solution -------------------------------------
revoke select on public.exercises from anon, authenticated;
grant select (
  id, lesson_id, kind, title, statement_md, media_url, attachment_path,
  explanation_md, difficulty, sort_order, status, metadata, created_at, updated_at
) on public.exercises to anon, authenticated;

-- Le staff passe par des fonctions SECURITY DEFINER dédiées (0008) pour lire
-- ces colonnes : get_lesson_content(), staff_get_answers(),
-- staff_get_exercise_solution(). service_role conserve l'accès complet.

-- ===========================================================================
-- DONNÉES PERSONNELLES
-- ===========================================================================

-- Progression vidéo et leçon : écriture directe autorisée (aucun enjeu de
-- triche exploitable), mais toujours restreinte à sa propre ligne.
drop policy if exists video_progress_own on public.video_progress;
create policy video_progress_own on public.video_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists video_progress_staff on public.video_progress;
create policy video_progress_staff on public.video_progress for select using (public.is_staff());

drop policy if exists lesson_progress_own on public.lesson_progress;
create policy lesson_progress_own on public.lesson_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists lesson_progress_staff on public.lesson_progress;
create policy lesson_progress_staff on public.lesson_progress for select using (public.is_staff());

-- course_progress est un cache maintenu par trigger : lecture seule côté client.
drop policy if exists course_progress_select on public.course_progress;
create policy course_progress_select on public.course_progress for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists study_sessions_select on public.study_sessions;
create policy study_sessions_select on public.study_sessions for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists notes_own on public.notes;
create policy notes_own on public.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists goals_own on public.goals;
create policy goals_own on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists goal_periods_select on public.goal_periods;
create policy goal_periods_select on public.goal_periods for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select using (user_id = auth.uid());
drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
drop policy if exists notifications_admin  on public.notifications;
create policy notifications_admin  on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists notif_prefs_own on public.notification_preferences;
create policy notif_prefs_own on public.notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists interests_own on public.user_subject_interests;
create policy interests_own on public.user_subject_interests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists exercise_attempts_own on public.exercise_attempts;
create policy exercise_attempts_own on public.exercise_attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists exercise_attempts_staff on public.exercise_attempts;
create policy exercise_attempts_staff on public.exercise_attempts for select using (public.is_staff());

-- ===========================================================================
-- SCORES, XP, BADGES : LECTURE SEULE
-- Aucune policy INSERT/UPDATE pour l'utilisateur. Ces lignes ne peuvent être
-- créées que par les fonctions SECURITY DEFINER (submit_quiz_attempt, award_xp,
-- check_badges). Un membre ne peut donc ni s'inventer un score ni de l'XP.
-- ===========================================================================
drop policy if exists quiz_attempts_select on public.quiz_attempts;
create policy quiz_attempts_select on public.quiz_attempts for select
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists quiz_attempt_answers_select on public.quiz_attempt_answers;
create policy quiz_attempt_answers_select on public.quiz_attempt_answers for select using (
  exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_attempt_answers.attempt_id
      and (a.user_id = auth.uid() or public.is_staff())
  )
);

drop policy if exists xp_events_select   on public.xp_events;
create policy xp_events_select   on public.xp_events   for select using (user_id = auth.uid() or public.is_staff());
drop policy if exists user_badges_select on public.user_badges;
create policy user_badges_select on public.user_badges for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists badges_select on public.badges;
create policy badges_select on public.badges for select using (is_active or public.is_staff());
drop policy if exists badges_admin  on public.badges;
create policy badges_admin  on public.badges for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- ACCÈS
-- access_codes est TOTALEMENT invisible aux non-admins : sans cela, tout membre
-- inscrit pourrait énumérer les codes valides via l'API REST.
-- Aucune policy INSERT sur enrollments : redeem_access_code() est le seul chemin.
-- ===========================================================================
drop policy if exists enrollments_select_own on public.enrollments;
create policy enrollments_select_own on public.enrollments for select using (user_id = auth.uid());
drop policy if exists enrollments_admin      on public.enrollments;
create policy enrollments_admin      on public.enrollments for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists access_codes_admin on public.access_codes;
create policy access_codes_admin on public.access_codes for all
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists code_redemptions_select_own on public.code_redemptions;
create policy code_redemptions_select_own on public.code_redemptions for select using (user_id = auth.uid());
drop policy if exists code_redemptions_admin      on public.code_redemptions;
create policy code_redemptions_admin      on public.code_redemptions for all
  using (public.is_admin()) with check (public.is_admin());

-- ###########################################################################
-- ### 0010_storage.sql
-- ###########################################################################

-- ===========================================================================
-- 0010 — Buckets de stockage
-- Aucune vidéo ici : les fichiers vidéo vivent chez le fournisseur (R2,
-- YouTube…). Ce bucket ne reçoit que des documents (20 Mo maximum).
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',    'avatars',    true,  2 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('thumbnails', 'thumbnails', true,  4 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('resources',  'resources',  false, 20 * 1024 * 1024, null)
on conflict (id) do nothing;

-- --- avatars : chaque membre n'écrit que dans son propre dossier ----------
drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_own_write" on storage.objects;
create policy "avatars_own_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- thumbnails : lecture publique, écriture staff ------------------------
drop policy if exists "thumbnails_public_read" on storage.objects;
create policy "thumbnails_public_read" on storage.objects for select
  using (bucket_id = 'thumbnails');

drop policy if exists "thumbnails_staff_write" on storage.objects;
create policy "thumbnails_staff_write" on storage.objects for all to authenticated
  using (bucket_id = 'thumbnails' and public.is_staff())
  with check (bucket_id = 'thumbnails' and public.is_staff());

-- --- resources : privé. La lecture passe par une URL signée générée côté
--     serveur après vérification de l'accès à la formation.
drop policy if exists "resources_staff_all" on storage.objects;
create policy "resources_staff_all" on storage.objects for all to authenticated
  using (bucket_id = 'resources' and public.is_staff())
  with check (bucket_id = 'resources' and public.is_staff());

-- ###########################################################################
-- ### 0011_auth_hardening.sql
-- ###########################################################################

-- ===========================================================================
-- 0011 — Robustesse de l'authentification
--
-- Corrige un mode de panne observé : un compte existe dans auth.users mais sa
-- ligne profiles est absente. Cela arrive quand le trigger on_auth_user_created
-- n'était pas encore en place au moment de l'inscription — typiquement si les
-- migrations ont été appliquées dans le désordre, ou si un compte a été créé
-- depuis le tableau de bord Supabase avant la migration 0006.
--
-- Conséquence sans ce correctif : getSessionUser() renvoie null alors que la
-- session est valide. Le membre est alors renvoyé vers /login, où le proxy le
-- renvoie vers /dashboard parce que sa session existe — boucle de redirection,
-- compte inutilisable, et aucun message d'erreur.
-- ===========================================================================

create or replace function public.ensure_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meta    jsonb;
  v_created boolean := false;
begin
  if v_user_id is null then
    return false;
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    -- Le profil existe : on s'assure seulement que les préférences suivent.
    insert into public.notification_preferences (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;
    return true;
  end if;

  select raw_user_meta_data into v_meta from auth.users where id = v_user_id;

  if not found then
    return false;
  end if;

  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    v_user_id,
    nullif(trim(v_meta ->> 'first_name'), ''),
    nullif(trim(v_meta ->> 'last_name'), ''),
    nullif(trim(v_meta ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  v_created := found;

  insert into public.notification_preferences (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  return v_created or exists (select 1 from public.profiles where id = v_user_id);
end;
$$;

-- Réparation rétroactive des comptes déjà créés sans profil.
insert into public.profiles (id, first_name, last_name, avatar_url)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
left join public.notification_preferences n on n.user_id = p.id
where n.user_id is null;


-- ===========================================================================
-- Récapitulatif
-- ===========================================================================
select
  (select count(*) from information_schema.tables
     where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
  (select count(*) from information_schema.views
     where table_schema = 'public')                               as vues,
  (select count(*) from pg_policies where schemaname = 'public')  as policies,
  (select count(*) from pg_tables
     where schemaname = 'public' and not rowsecurity)             as tables_sans_rls;
