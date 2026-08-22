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
