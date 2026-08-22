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
