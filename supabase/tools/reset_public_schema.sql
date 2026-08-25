-- ===========================================================================
--  ⚠  SCRIPT DESTRUCTIF  ⚠
--
--  Efface INTÉGRALEMENT le schéma `public` : toutes les tables, toutes les
--  données, toutes les fonctions. Sans confirmation et sans retour possible.
--
--  À N'UTILISER QUE sur un projet Supabase neuf, avant la première
--  installation. Si votre base contient des données que vous voulez garder,
--  N'EXÉCUTEZ PAS CE FICHIER.
--
--  Ce qui n'est PAS effacé :
--    • les comptes (schéma `auth`) — vos utilisateurs restent inscrits ;
--    • les fichiers (schéma `storage`).
--
--  Les comptes existants retrouveront automatiquement leur profil : la
--  migration 0011 recrée les lignes `profiles` manquantes à partir de
--  `auth.users`.
--
--  APRÈS ce script, appliquez dans l'ordre :
--    0000_preflight.sql  (doit afficher « le schéma public est libre »)
--    0001 → 0011
--    seed.sql
-- ===========================================================================

-- Le trigger vit dans le schéma auth : il faut le retirer explicitement,
-- sinon il survivrait en pointant vers une fonction supprimée.
drop trigger if exists on_auth_user_created on auth.users;

drop schema if exists public cascade;
create schema public;

-- Privilèges par défaut d'un projet Supabase. Sans eux, PostgREST ne voit
-- plus aucune table et l'API renvoie « permission denied » sur tout.
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all   on schema public to postgres, service_role;

alter default privileges in schema public
  grant all on tables to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, anon, authenticated, service_role;
alter default privileges in schema public
  grant all on functions to postgres, anon, authenticated, service_role;

-- Les policies posées sur storage.objects par la migration 0010 survivent au
-- reset (elles vivent dans le schéma storage) mais référencent des fonctions
-- désormais absentes. On les retire : 0010 les recrée.
drop policy if exists "avatars_public_read"    on storage.objects;
drop policy if exists "avatars_own_write"      on storage.objects;
drop policy if exists "avatars_own_update"     on storage.objects;
drop policy if exists "avatars_own_delete"     on storage.objects;
drop policy if exists "thumbnails_public_read" on storage.objects;
drop policy if exists "thumbnails_staff_write" on storage.objects;
drop policy if exists "resources_staff_all"    on storage.objects;

select
  'Schéma public réinitialisé. Appliquez 0000_preflight.sql, puis 0001 à 0011.'
  as etape_suivante;
