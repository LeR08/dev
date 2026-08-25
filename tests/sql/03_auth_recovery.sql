-- ===========================================================================
-- Test de robustesse de l'authentification (migration 0011).
--
-- Reproduit le mode de panne réel : un compte existe dans auth.users sans
-- ligne profiles. Sans réparation, la session est valide mais inutilisable et
-- le membre tourne en boucle entre /login et /dashboard.
-- ===========================================================================
\set ON_ERROR_STOP on

do $$
declare
  v_user  uuid;
  v_count int;
  v_ok    boolean;
begin
  delete from auth.users where email like 'recovery-%@demo.invalid';

  -- --- 1. Le trigger crée bien profil et préférences --------------------
  insert into auth.users (email, raw_user_meta_data)
  values ('recovery-normal@demo.invalid', '{"first_name":"Alix","last_name":"Martin"}'::jsonb)
  returning id into v_user;

  select count(*) into v_count from public.profiles where id = v_user;
  if v_count <> 1 then
    raise exception 'ECHEC : le trigger n''a pas créé le profil';
  end if;

  select count(*) into v_count from public.notification_preferences where user_id = v_user;
  if v_count <> 1 then
    raise exception 'ECHEC : préférences de notification absentes';
  end if;
  raise notice 'OK  inscription normale : profil et préférences créés';

  -- Les métadonnées d'inscription sont reprises
  if not exists (
    select 1 from public.profiles
    where id = v_user and first_name = 'Alix' and last_name = 'Martin'
  ) then
    raise exception 'ECHEC : prénom et nom non repris depuis les métadonnées';
  end if;
  raise notice 'OK  prénom et nom repris depuis les métadonnées d''inscription';

  -- --- 2. Simulation du compte orphelin ---------------------------------
  -- On supprime le profil sans toucher au compte : c'est exactement l'état
  -- d'un compte créé avant l'application de la migration 0006.
  delete from public.profiles where id = v_user;

  if exists (select 1 from public.profiles where id = v_user) then
    raise exception 'ECHEC : le profil n''a pas pu être supprimé pour le test';
  end if;

  -- On se fait passer pour ce membre, comme le ferait une vraie session.
  perform set_config('request.jwt.claim.sub', v_user::text, false);

  v_ok := public.ensure_profile();
  if not v_ok then
    raise exception 'ECHEC : ensure_profile() n''a pas réparé le compte';
  end if;

  if not exists (select 1 from public.profiles where id = v_user) then
    raise exception 'ECHEC : le profil n''a pas été recréé';
  end if;
  raise notice 'OK  ensure_profile() recrée le profil manquant';

  if not exists (
    select 1 from public.profiles
    where id = v_user and first_name = 'Alix' and last_name = 'Martin'
  ) then
    raise exception 'ECHEC : la réparation a perdu les métadonnées';
  end if;
  raise notice 'OK  la réparation conserve prénom et nom';

  -- --- 3. Idempotence ----------------------------------------------------
  v_ok := public.ensure_profile();
  select count(*) into v_count from public.profiles where id = v_user;
  if not v_ok or v_count <> 1 then
    raise exception 'ECHEC : second appel non idempotent (% profil(s))', v_count;
  end if;
  raise notice 'OK  ensure_profile() est idempotente';

  -- --- 4. Le profil réparé est bien celui d'un membre ordinaire ---------
  if not exists (
    select 1 from public.profiles
    where id = v_user and role = 'student' and is_active and not onboarding_done
  ) then
    raise exception 'ECHEC : le profil réparé n''a pas les valeurs par défaut';
  end if;
  raise notice 'OK  le profil réparé a les valeurs par défaut (student, actif)';

  -- --- 5. Sans session, la fonction ne fait rien -------------------------
  perform set_config('request.jwt.claim.sub', '', false);
  if public.ensure_profile() then
    raise exception 'ECHEC : ensure_profile() a agi sans session';
  end if;
  raise notice 'OK  ensure_profile() refuse d''agir sans session';

  -- --- 6. Aucun compte orphelin ne subsiste ------------------------------
  select count(*) into v_count
  from auth.users u
  left join public.profiles p on p.id = u.id
  where p.id is null;

  if v_count <> 0 then
    raise exception 'ECHEC : % compte(s) sans profil subsistent', v_count;
  end if;
  raise notice 'OK  aucun compte orphelin dans la base';

  delete from auth.users where email like 'recovery-%@demo.invalid';

  raise notice '';
  raise notice '=== Robustesse de l''authentification : tous les tests passent ===';
end $$;
