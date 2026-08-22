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
    status = case when lesson_progress.status = 'completed'
                  then 'completed' else 'in_progress' end;

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
