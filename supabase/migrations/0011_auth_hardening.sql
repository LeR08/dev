-- ===========================================================================
-- 0011 — Robustesse de l'authentification
--
-- Corrige un mode de panne observé : un compte existe dans auth.users mais sa
-- ligne profiles est absente. Cela arrive quand le trigger on_auth_user_created
-- n'était pas encore en place au moment de l'inscription — typiquement si les
-- migrations ont été appliquées dans le désordre, ou si un compte a été créé
-- depuis le tableau de bord Supabase avant la migration 0006.
--
-- Conséquence sans ce correctif : getSessionUser() renvoie null alors que la
-- session est valide. Le membre est alors renvoyé vers /login, où le proxy le
-- renvoie vers /dashboard parce que sa session existe — boucle de redirection,
-- compte inutilisable, et aucun message d'erreur.
-- ===========================================================================

create or replace function public.ensure_profile()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_meta    jsonb;
  v_created boolean := false;
begin
  if v_user_id is null then
    return false;
  end if;

  if exists (select 1 from public.profiles where id = v_user_id) then
    -- Le profil existe : on s'assure seulement que les préférences suivent.
    insert into public.notification_preferences (user_id)
    values (v_user_id)
    on conflict (user_id) do nothing;
    return true;
  end if;

  select raw_user_meta_data into v_meta from auth.users where id = v_user_id;

  if not found then
    return false;
  end if;

  insert into public.profiles (id, first_name, last_name, avatar_url)
  values (
    v_user_id,
    nullif(trim(v_meta ->> 'first_name'), ''),
    nullif(trim(v_meta ->> 'last_name'), ''),
    nullif(trim(v_meta ->> 'avatar_url'), '')
  )
  on conflict (id) do nothing;

  v_created := found;

  insert into public.notification_preferences (user_id)
  values (v_user_id)
  on conflict (user_id) do nothing;

  return v_created or exists (select 1 from public.profiles where id = v_user_id);
end;
$$;

-- Réparation rétroactive des comptes déjà créés sans profil.
insert into public.profiles (id, first_name, last_name, avatar_url)
select
  u.id,
  nullif(trim(u.raw_user_meta_data ->> 'first_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'last_name'), ''),
  nullif(trim(u.raw_user_meta_data ->> 'avatar_url'), '')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
left join public.notification_preferences n on n.user_id = p.id
where n.user_id is null;
