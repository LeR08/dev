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
