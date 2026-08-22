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
create policy profiles_select_own   on public.profiles for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles for select using (public.is_staff());
create policy profiles_update_own   on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_admin_all    on public.profiles for all
  using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- CONTENU — NIVEAU 1 : structure publique (catalogue, programme, SEO)
-- ===========================================================================
create policy levels_select   on public.levels   for select using (status = 'published');
create policy levels_staff    on public.levels   for all using (public.is_staff()) with check (public.is_staff());

create policy subjects_select on public.subjects for select using (status = 'published');
create policy subjects_staff  on public.subjects for all using (public.is_staff()) with check (public.is_staff());

create policy level_subjects_select on public.level_subjects for select using (true);
create policy level_subjects_staff  on public.level_subjects for all using (public.is_staff()) with check (public.is_staff());

create policy courses_select on public.courses for select using (status = 'published');
create policy courses_staff  on public.courses for all using (public.is_staff()) with check (public.is_staff());

create policy modules_select on public.modules for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = modules.course_id and c.status = 'published')
);
create policy modules_staff on public.modules for all using (public.is_staff()) with check (public.is_staff());

create policy chapters_select on public.chapters for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = chapters.course_id and c.status = 'published')
);
create policy chapters_staff on public.chapters for all using (public.is_staff()) with check (public.is_staff());

-- La LIGNE d'une leçon reste lisible : c'est le programme, l'argument de vente.
-- La COLONNE content_md est révoquée plus bas et passe par get_lesson_content().
create policy lessons_select on public.lessons for select using (
  status = 'published'
  and exists (select 1 from public.courses c where c.id = lessons.course_id and c.status = 'published')
);
create policy lessons_staff on public.lessons for all using (public.is_staff()) with check (public.is_staff());

-- ===========================================================================
-- CONTENU — NIVEAU 2 : réservé aux membres ayant un accès valide
-- ===========================================================================
create policy videos_select on public.videos for select using (
  exists (
    select 1 from public.lessons l
    where l.id = videos.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
create policy videos_staff on public.videos for all using (public.is_staff()) with check (public.is_staff());

create policy resources_select on public.resources for select using (
  (resources.course_id is not null and public.has_course_access(resources.course_id))
  or exists (
    select 1 from public.lessons l
    where l.id = resources.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
create policy resources_staff on public.resources for all using (public.is_staff()) with check (public.is_staff());

create policy quizzes_select on public.quizzes for select using (
  status = 'published' and public.has_course_access(quizzes.course_id)
);
create policy quizzes_staff on public.quizzes for all using (public.is_staff()) with check (public.is_staff());

create policy questions_select on public.questions for select using (
  exists (
    select 1 from public.quizzes q
    where q.id = questions.quiz_id
      and q.status = 'published'
      and public.has_course_access(q.course_id)
  )
);
create policy questions_staff on public.questions for all using (public.is_staff()) with check (public.is_staff());

create policy answers_select on public.answers for select using (
  exists (
    select 1 from public.questions qu
    join public.quizzes q on q.id = qu.quiz_id
    where qu.id = answers.question_id
      and q.status = 'published'
      and public.has_course_access(q.course_id)
  )
);
create policy answers_staff on public.answers for all using (public.is_staff()) with check (public.is_staff());

create policy exercises_select on public.exercises for select using (
  status = 'published'
  and exists (
    select 1 from public.lessons l
    where l.id = exercises.lesson_id
      and l.status = 'published'
      and (l.is_free_preview or public.has_course_access(l.course_id))
  )
);
create policy exercises_staff on public.exercises for all using (public.is_staff()) with check (public.is_staff());

-- ===========================================================================
-- PRIVILÈGES DE COLONNE
-- La RLS filtre les LIGNES ; seuls les GRANT filtrent les COLONNES.
-- Sans ces révocations, n'importe quel membre lit les bonnes réponses et le
-- contenu payant depuis l'onglet réseau du navigateur.
-- ===========================================================================
revoke select (is_correct, match_pattern) on public.answers   from anon, authenticated;
revoke select (content_md)                on public.lessons   from anon, authenticated;
revoke select (expected_answer, tolerance, solution_md)
                                          on public.exercises from anon, authenticated;

-- ===========================================================================
-- DONNÉES PERSONNELLES
-- ===========================================================================

-- Progression vidéo et leçon : écriture directe autorisée (aucun enjeu de
-- triche exploitable), mais toujours restreinte à sa propre ligne.
create policy video_progress_own on public.video_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy video_progress_staff on public.video_progress for select using (public.is_staff());

create policy lesson_progress_own on public.lesson_progress for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy lesson_progress_staff on public.lesson_progress for select using (public.is_staff());

-- course_progress est un cache maintenu par trigger : lecture seule côté client.
create policy course_progress_select on public.course_progress for select
  using (user_id = auth.uid() or public.is_staff());

create policy study_sessions_select on public.study_sessions for select
  using (user_id = auth.uid() or public.is_staff());

create policy notes_own on public.notes for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy favorites_own on public.favorites for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy goals_own on public.goals for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy goal_periods_select on public.goal_periods for select
  using (user_id = auth.uid() or public.is_staff());

create policy notifications_select on public.notifications for select using (user_id = auth.uid());
create policy notifications_update on public.notifications for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete using (user_id = auth.uid());
create policy notifications_admin  on public.notifications for all
  using (public.is_admin()) with check (public.is_admin());

create policy notif_prefs_own on public.notification_preferences for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy interests_own on public.user_subject_interests for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy exercise_attempts_own on public.exercise_attempts for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy exercise_attempts_staff on public.exercise_attempts for select using (public.is_staff());

-- ===========================================================================
-- SCORES, XP, BADGES : LECTURE SEULE
-- Aucune policy INSERT/UPDATE pour l'utilisateur. Ces lignes ne peuvent être
-- créées que par les fonctions SECURITY DEFINER (submit_quiz_attempt, award_xp,
-- check_badges). Un membre ne peut donc ni s'inventer un score ni de l'XP.
-- ===========================================================================
create policy quiz_attempts_select on public.quiz_attempts for select
  using (user_id = auth.uid() or public.is_staff());

create policy quiz_attempt_answers_select on public.quiz_attempt_answers for select using (
  exists (
    select 1 from public.quiz_attempts a
    where a.id = quiz_attempt_answers.attempt_id
      and (a.user_id = auth.uid() or public.is_staff())
  )
);

create policy xp_events_select   on public.xp_events   for select using (user_id = auth.uid() or public.is_staff());
create policy user_badges_select on public.user_badges for select using (user_id = auth.uid() or public.is_staff());

create policy badges_select on public.badges for select using (is_active or public.is_staff());
create policy badges_admin  on public.badges for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- ACCÈS
-- access_codes est TOTALEMENT invisible aux non-admins : sans cela, tout membre
-- inscrit pourrait énumérer les codes valides via l'API REST.
-- Aucune policy INSERT sur enrollments : redeem_access_code() est le seul chemin.
-- ===========================================================================
create policy enrollments_select_own on public.enrollments for select using (user_id = auth.uid());
create policy enrollments_admin      on public.enrollments for all
  using (public.is_admin()) with check (public.is_admin());

create policy access_codes_admin on public.access_codes for all
  using (public.is_admin()) with check (public.is_admin());

create policy code_redemptions_select_own on public.code_redemptions for select using (user_id = auth.uid());
create policy code_redemptions_admin      on public.code_redemptions for all
  using (public.is_admin()) with check (public.is_admin());
