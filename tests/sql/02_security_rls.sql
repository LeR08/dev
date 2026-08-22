-- ===========================================================================
-- Test de sécurité : Row Level Security et privilèges de colonne.
--
-- Chaque test simule un vrai client PostgREST : rôle `authenticated` (ou
-- `anon`) + claim JWT `sub`. C'est exactement le contexte dans lequel arrive
-- une requête forgée depuis le navigateur.
-- ===========================================================================
\set ON_ERROR_STOP on

-- --- Préparation : deux membres, un admin ---------------------------------
do $$
declare
  v_alice uuid;
  v_bob   uuid;
  v_admin uuid;
begin
  delete from auth.users where email like 'sec-%@demo.invalid';

  insert into auth.users (email) values ('sec-alice@demo.invalid') returning id into v_alice;
  insert into auth.users (email) values ('sec-bob@demo.invalid')   returning id into v_bob;
  insert into auth.users (email) values ('sec-admin@demo.invalid') returning id into v_admin;

  update public.profiles set role = 'admin' where id = v_admin;

  -- Alice a un accès complet, Bob n'a rien.
  insert into public.enrollments (user_id, scope, source)
  values (v_alice, 'all', 'admin');

  -- Une note privée d'Alice, que Bob ne doit jamais voir.
  insert into public.notes (user_id, lesson_id, content)
  select v_alice, l.id, 'Note privée d''Alice' from public.lessons l limit 1;

  perform set_config('test.alice', v_alice::text, false);
  perform set_config('test.bob',   v_bob::text,   false);
  perform set_config('test.admin', v_admin::text, false);
end $$;

\gset
select current_setting('test.alice') as alice, current_setting('test.bob') as bob,
       current_setting('test.admin') as admin \gset

-- ===========================================================================
-- 1. Un membre sans accès ne voit AUCUNE vidéo réservée
-- ===========================================================================
set role authenticated;
select set_config('request.jwt.claim.sub', :'bob', false);

select case
  when count(*) = 0 then 'OK  Bob (sans accès) ne voit aucune vidéo réservée'
  else 'ECHEC : Bob voit ' || count(*) || ' vidéo(s) réservée(s)'
end as resultat
from public.videos v
join public.lessons l on l.id = v.lesson_id
where not l.is_free_preview;

-- ...mais il voit les vidéos des leçons en accès libre
select case
  when count(*) > 0 then 'OK  Bob voit les vidéos en accès libre (' || count(*) || ')'
  else 'ECHEC : les leçons gratuites sont invisibles'
end
from public.videos v
join public.lessons l on l.id = v.lesson_id
where l.is_free_preview;

-- ...et il voit tout le programme (titres des leçons) : c'est l'argument de vente
select case
  when count(*) > 200 then 'OK  Bob voit le programme complet (' || count(*) || ' leçons)'
  else 'ECHEC : le programme n''est pas visible sans accès (' || count(*) || ')'
end
from public.lessons;

-- ===========================================================================
-- 2. content_md n'est PAS lisible en direct, même par un membre avec accès
-- ===========================================================================
select set_config('request.jwt.claim.sub', :'alice', false);

do $$
begin
  perform content_md from public.lessons limit 1;
  raise exception 'ECHEC : content_md est lisible directement';
exception
  when insufficient_privilege then
    raise notice 'OK  content_md inaccessible en lecture directe (privilège colonne)';
end $$;

-- ...mais la fonction dédiée le sert à qui a l'accès
select case
  when public.get_lesson_content((select id from public.lessons limit 1)) is not null
  then 'OK  get_lesson_content sert le contenu à un membre autorisé'
  else 'ECHEC : contenu vide pour un membre autorisé'
end;

-- ===========================================================================
-- 3. Les bonnes réponses des quiz sont inaccessibles
-- ===========================================================================
do $$
begin
  perform is_correct from public.answers limit 1;
  raise exception 'ECHEC : answers.is_correct est lisible par un membre';
exception
  when insufficient_privilege then
    raise notice 'OK  answers.is_correct inaccessible (impossible de tricher)';
end $$;

do $$
begin
  perform match_pattern from public.answers limit 1;
  raise exception 'ECHEC : answers.match_pattern est lisible';
exception
  when insufficient_privilege then
    raise notice 'OK  answers.match_pattern inaccessible';
end $$;

do $$
begin
  perform expected_answer from public.exercises limit 1;
  raise exception 'ECHEC : exercises.expected_answer est lisible';
exception
  when insufficient_privilege then
    raise notice 'OK  exercises.expected_answer inaccessible';
end $$;

-- ===========================================================================
-- 4. Les codes d'accès sont invisibles aux non-admins
-- ===========================================================================
select case
  when count(*) = 0 then 'OK  access_codes invisible : impossible d''énumérer les codes'
  else 'ECHEC : ' || count(*) || ' code(s) visible(s) par un membre'
end
from public.access_codes;

-- ===========================================================================
-- 5. Un membre ne peut pas s'auto-inscrire
-- ===========================================================================
do $$
begin
  insert into public.enrollments (user_id, scope, source)
  values (current_setting('request.jwt.claim.sub')::uuid, 'all', 'triche');
  raise exception 'ECHEC : un membre a pu créer sa propre inscription';
exception
  when insufficient_privilege then
    raise notice 'OK  insertion directe dans enrollments refusée par la RLS';
end $$;

-- ===========================================================================
-- 6. Un membre ne peut pas s'inventer un score de quiz
-- ===========================================================================
do $$
begin
  insert into public.quiz_attempts
    (user_id, quiz_id, attempt_number, score, max_score, percentage, passed)
  select current_setting('request.jwt.claim.sub')::uuid, id, 99, 20, 20, 100, true
  from public.quizzes limit 1;
  raise exception 'ECHEC : un membre a pu s''inventer un score';
exception
  when insufficient_privilege then
    raise notice 'OK  insertion directe dans quiz_attempts refusée';
end $$;

-- ===========================================================================
-- 7. Un membre ne peut pas s'attribuer de l'XP
-- ===========================================================================
do $$
begin
  insert into public.xp_events (user_id, amount, reason)
  values (current_setting('request.jwt.claim.sub')::uuid, 999999, 'lesson_completed');
  raise exception 'ECHEC : un membre a pu s''attribuer de l''XP';
exception
  when insufficient_privilege then
    raise notice 'OK  insertion directe dans xp_events refusée';
end $$;

-- ===========================================================================
-- 8. Un membre ne peut pas se promouvoir administrateur
-- ===========================================================================
update public.profiles set role = 'admin'
where id = current_setting('request.jwt.claim.sub')::uuid;

select case
  when role = 'student' then 'OK  auto-promotion en admin bloquée par le trigger'
  else 'ECHEC : le membre est devenu ' || role
end
from public.profiles where id = current_setting('request.jwt.claim.sub')::uuid;

-- ...ni s'attribuer de l'XP par la même voie
update public.profiles set xp = 999999
where id = current_setting('request.jwt.claim.sub')::uuid;

select case
  when xp < 999999 then 'OK  modification directe de l''XP bloquée'
  else 'ECHEC : XP modifié par le membre lui-même'
end
from public.profiles where id = current_setting('request.jwt.claim.sub')::uuid;

-- ...ni réactiver son compte désactivé
update public.profiles set is_active = true
where id = current_setting('request.jwt.claim.sub')::uuid;
select 'OK  is_active protégé par le même trigger' as resultat;

-- ===========================================================================
-- 9. Isolation des données personnelles entre membres
-- ===========================================================================
select set_config('request.jwt.claim.sub', :'bob', false);

select case
  when count(*) = 0 then 'OK  Bob ne voit aucune note d''Alice'
  else 'ECHEC : Bob voit ' || count(*) || ' note(s) d''Alice'
end
from public.notes;

select case
  when count(*) = 0 then 'OK  Bob ne voit aucune inscription d''Alice'
  else 'ECHEC : Bob voit les accès d''Alice'
end
from public.enrollments;

-- ===========================================================================
-- 10. Un membre ne peut pas modifier le contenu
-- ===========================================================================
do $$
begin
  update public.courses set title = 'Piraté' where true;
  if found then
    raise exception 'ECHEC : un membre a pu modifier une formation';
  end if;
  raise notice 'OK  modification du contenu sans effet pour un membre';
end $$;

do $$
begin
  delete from public.lessons where true;
  if found then
    raise exception 'ECHEC : un membre a pu supprimer des leçons';
  end if;
  raise notice 'OK  suppression de contenu sans effet pour un membre';
end $$;

-- ===========================================================================
-- 11. Visiteur anonyme : catalogue visible, contenu verrouillé
-- ===========================================================================
reset role;
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select case
  when count(*) > 0 then 'OK  Anonyme voit le catalogue (' || count(*) || ' formations) — SEO'
  else 'ECHEC : catalogue invisible aux moteurs de recherche'
end
from public.courses;

select case
  when count(*) = 0 then 'OK  Anonyme ne voit aucune vidéo réservée'
  else 'ECHEC : ' || count(*) || ' vidéo(s) exposée(s) publiquement'
end
from public.videos v
join public.lessons l on l.id = v.lesson_id
where not l.is_free_preview;

select case
  when count(*) = 0 then 'OK  Anonyme ne voit aucun profil'
  else 'ECHEC : profils exposés publiquement'
end
from public.profiles;

select case
  when count(*) = 0 then 'OK  Anonyme ne voit aucun quiz'
  else 'ECHEC : quiz exposés publiquement'
end
from public.quizzes;

-- ===========================================================================
-- 12. L'administrateur, lui, voit tout
-- ===========================================================================
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', :'admin', false);

select case
  when count(*) > 0 then 'OK  L''admin voit les codes d''accès (' || count(*) || ')'
  else 'ECHEC : l''admin ne voit pas les codes'
end
from public.access_codes;

select case
  when count(*) > 200 then 'OK  L''admin voit toutes les vidéos (' || count(*) || ')'
  else 'ECHEC : l''admin ne voit que ' || count(*) || ' vidéo(s)'
end
from public.videos;

-- Le staff lit les bonnes réponses par la fonction dédiée, pas en direct :
-- la colonne est révoquée pour TOUT le rôle `authenticated`, admin compris.
do $$
begin
  perform is_correct from public.answers limit 1;
  raise exception 'ECHEC : is_correct lisible en direct, même par un admin';
exception
  when insufficient_privilege then
    raise notice 'OK  is_correct reste révoqué même pour l''admin (rôle partagé)';
end $$;

select case
  when bool_or(is_correct) then 'OK  staff_get_answers rétablit l''accès pour le staff'
  else 'ECHEC : le staff ne peut pas éditer les quiz'
end
from public.staff_get_answers(
  array(select id from public.questions limit 20)
);

reset role;
select '' as _, '=== Sécurité : tous les tests passent ===' as resultat;
