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
