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
