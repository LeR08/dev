-- ===========================================================================
-- Test de la logique métier : progression, XP, complétion en cascade, quiz.
-- Exécuté contre une base réelle (voir tests/README.md).
-- ===========================================================================
\set ON_ERROR_STOP on
\timing off

do $$
declare
  v_user     uuid;
  v_course   uuid;
  v_lesson   uuid;
  v_video    uuid;
  v_quiz     uuid;
  v_result   jsonb;
  v_xp       int;
  v_percent  numeric;
  v_count    int;
  v_status   text;
  v_exercise uuid;
begin
  -- --- Préparation : un membre de test ------------------------------------
  insert into auth.users (email, raw_user_meta_data)
  values ('test-logic@demo.invalid', '{"first_name":"Test","last_name":"Logique"}'::jsonb)
  returning id into v_user;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'ECHEC : le trigger handle_new_user n''a pas créé le profil';
  end if;

  if not exists (select 1 from public.notification_preferences where user_id = v_user) then
    raise exception 'ECHEC : les préférences de notification n''ont pas été créées';
  end if;
  raise notice 'OK  trigger d''inscription : profil + préférences créés';

  -- Se faire passer pour ce membre (équivalent d'un JWT Supabase)
  perform set_config('request.jwt.claim.sub', v_user::text, false);

  select c.id into v_course from public.courses c where c.slug = 'meta-ads-de-a-a-z';

  -- --- Accès : sans inscription, tout est verrouillé ----------------------
  if public.has_course_access(v_course) then
    raise exception 'ECHEC : accès accordé sans inscription';
  end if;
  raise notice 'OK  has_course_access refuse sans inscription';

  -- --- Activation d'un code ----------------------------------------------
  v_result := public.redeem_access_code('DEMO-FULL-2026');
  if not (v_result->>'ok')::boolean then
    raise exception 'ECHEC activation : %', v_result->>'message';
  end if;

  if not public.has_course_access(v_course) then
    raise exception 'ECHEC : accès toujours refusé après activation';
  end if;
  raise notice 'OK  redeem_access_code débloque l''accès';

  -- Le même code ne peut pas servir deux fois au même membre
  v_result := public.redeem_access_code('DEMO-FULL-2026');
  if (v_result->>'ok')::boolean then
    raise exception 'ECHEC : le même code a pu être réutilisé';
  end if;
  if v_result->>'error' <> 'already_used' then
    raise exception 'ECHEC : mauvaise erreur (%), attendu already_used', v_result->>'error';
  end if;
  raise notice 'OK  un code ne peut pas être réutilisé par le même membre';

  -- Un code inexistant est refusé proprement
  v_result := public.redeem_access_code('NEXISTE-PAS-42');
  if (v_result->>'ok')::boolean or v_result->>'error' <> 'not_found' then
    raise exception 'ECHEC : code inexistant mal géré';
  end if;
  raise notice 'OK  code inexistant refusé avec un message explicite';

  -- --- Progression vidéo --------------------------------------------------
  select l.id into v_lesson
  from public.lessons l where l.course_id = v_course order by l.sort_order limit 1;
  select v.id into v_video from public.videos v where v.lesson_id = v_lesson limit 1;

  -- 30 % de la vidéo : ni complétion, ni leçon terminée
  perform public.upsert_video_progress(v_video, 216, 216);   -- 216 s sur 720 s
  select percent into v_percent
  from public.video_progress where user_id = v_user and video_id = v_video;

  if v_percent < 29 or v_percent > 31 then
    raise exception 'ECHEC : pourcentage attendu ~30, obtenu %', v_percent;
  end if;

  select status::text into v_status from public.lesson_progress
  where user_id = v_user and lesson_id = v_lesson;
  if v_status <> 'in_progress' then
    raise exception 'ECHEC : la leçon devrait être in_progress, elle est %', v_status;
  end if;
  raise notice 'OK  progression vidéo à 30%% : leçon en cours, non terminée';

  -- La position enregistrée est bien celle transmise (reprise de lecture)
  select position_seconds into v_count from public.video_progress
  where user_id = v_user and video_id = v_video;
  if v_count <> 216 then
    raise exception 'ECHEC : position attendue 216, obtenue %', v_count;
  end if;
  raise notice 'OK  la position de lecture est mémorisée (reprise)';

  -- --- Complétion en cascade ---------------------------------------------
  select xp into v_xp from public.profiles where id = v_user;

  perform public.upsert_video_progress(v_video, 700, 700);   -- 97 %

  if not exists (
    select 1 from public.lesson_progress
    where user_id = v_user and lesson_id = v_lesson and status = 'completed'
  ) then
    raise exception 'ECHEC : la leçon n''est pas passée à completed au-delà de 90%%';
  end if;
  raise notice 'OK  vidéo ≥ 90%% : la leçon passe automatiquement à terminée';

  -- L'XP de la leçon est attribué exactement une fois. On teste le journal
  -- xp_events plutôt que le total : celui-ci inclut aussi l'XP des badges.
  select count(*) into v_count from public.xp_events
  where user_id = v_user and reason = 'lesson_completed' and source_id = v_lesson;
  if v_count <> 1 then
    raise exception 'ECHEC : % événement(s) XP pour la leçon, attendu 1', v_count;
  end if;

  select xp into v_count from public.profiles where id = v_user;
  if v_count < v_xp + 25 then
    raise exception 'ECHEC : XP non crédité (% avant, % après)', v_xp, v_count;
  end if;
  v_xp := v_count;

  perform public.set_lesson_completed(v_lesson, true);   -- deuxième complétion

  select count(*) into v_count from public.xp_events
  where user_id = v_user and reason = 'lesson_completed' and source_id = v_lesson;
  if v_count <> 1 then
    raise exception 'ECHEC : XP attribué % fois pour la même leçon', v_count;
  end if;

  select xp into v_count from public.profiles where id = v_user;
  if v_count <> v_xp then
    raise exception 'ECHEC : le total d''XP a bougé sur une seconde complétion (% -> %)',
      v_xp, v_count;
  end if;
  raise notice 'OK  l''XP d''une leçon n''est jamais attribué deux fois';

  -- --- course_progress maintenu par trigger -------------------------------
  select percent into v_percent from public.course_progress
  where user_id = v_user and course_id = v_course;
  if v_percent is null or v_percent <= 0 then
    raise exception 'ECHEC : course_progress non recalculé (percent = %)', v_percent;
  end if;
  raise notice 'OK  course_progress recalculé par trigger (% %%)', round(v_percent, 2);

  -- --- Série de jours -----------------------------------------------------
  select streak_current into v_count from public.profiles where id = v_user;
  if v_count <> 1 then
    raise exception 'ECHEC : série attendue 1, obtenue %', v_count;
  end if;
  raise notice 'OK  série de jours initialisée à 1';

  -- --- Badge « premier pas » ---------------------------------------------
  if not exists (
    select 1 from public.user_badges ub
    join public.badges b on b.id = ub.badge_id
    where ub.user_id = v_user and b.code = 'first_lesson'
  ) then
    raise exception 'ECHEC : le badge first_lesson n''a pas été attribué';
  end if;
  raise notice 'OK  badge attribué automatiquement à la première leçon';

  -- --- Correction de quiz -------------------------------------------------
  select q.id into v_quiz from public.quizzes q
  where q.course_id = v_course order by q.created_at limit 1;

  -- Toutes les bonnes réponses
  v_result := public.submit_quiz_attempt(
    v_quiz,
    (select jsonb_agg(jsonb_build_object(
       'question_id', qu.id,
       'answer_ids', coalesce((select jsonb_agg(a.id) from public.answers a
                               where a.question_id = qu.id and a.is_correct), '[]'::jsonb),
       'text', (select a.label from public.answers a
                where a.question_id = qu.id and a.is_correct limit 1)))
     from public.questions qu where qu.quiz_id = v_quiz)
  );

  if (v_result->>'percentage')::numeric <> 100 then
    raise exception 'ECHEC : score attendu 100%%, obtenu %', v_result->>'percentage';
  end if;
  if not (v_result->>'passed')::boolean then
    raise exception 'ECHEC : le quiz devrait être réussi';
  end if;
  raise notice 'OK  quiz corrigé côté serveur : 100%%, réussi';

  -- Les explications ne reviennent qu'après soumission
  if jsonb_array_length(v_result->'details') = 0 then
    raise exception 'ECHEC : la correction détaillée est absente';
  end if;
  raise notice 'OK  correction détaillée renvoyée après soumission';

  -- Aucune réponse : 0 %
  v_result := public.submit_quiz_attempt(
    v_quiz,
    (select jsonb_agg(jsonb_build_object('question_id', qu.id, 'answer_ids', '[]'::jsonb))
     from public.questions qu where qu.quiz_id = v_quiz)
  );
  if (v_result->>'percentage')::numeric <> 0 then
    raise exception 'ECHEC : sans réponse, le score devrait être 0, obtenu %',
      v_result->>'percentage';
  end if;
  raise notice 'OK  questions sans réponse comptées comme fausses';

  -- Le numéro de tentative s'incrémente
  if (v_result->>'attempt_number')::int <> 2 then
    raise exception 'ECHEC : numéro de tentative attendu 2, obtenu %',
      v_result->>'attempt_number';
  end if;
  raise notice 'OK  numérotation des tentatives correcte';

  -- --- Exercice numérique -------------------------------------------------
  if exists (select 1 from public.exercises where kind = 'numeric') then
    select id into v_exercise from public.exercises where kind = 'numeric' limit 1;
    if public.grade_numeric_exercise(v_exercise, '120') is not true then
      raise exception 'ECHEC : correction numérique — 120 devrait être juste';
    end if;
    if public.grade_numeric_exercise(v_exercise, '119') is not false then
      raise exception 'ECHEC : correction numérique — 119 devrait être faux';
    end if;
    -- Virgule française acceptée
    if public.grade_numeric_exercise(v_exercise, '120,00') is not true then
      raise exception 'ECHEC : la virgule décimale devrait être acceptée';
    end if;
    raise notice 'OK  correction numérique (virgule française comprise)';
  end if;

  -- --- Temps d'étude ------------------------------------------------------
  perform public.record_study_time(600, v_course, null);
  select coalesce(sum(duration_seconds), 0) into v_count
  from public.study_sessions where user_id = v_user;
  if v_count <> 600 then
    raise exception 'ECHEC : temps d''étude attendu 600 s, obtenu %', v_count;
  end if;
  raise notice 'OK  temps d''étude enregistré';

  raise notice '';
  raise notice '=== Logique métier : tous les tests passent ===';
end $$;
