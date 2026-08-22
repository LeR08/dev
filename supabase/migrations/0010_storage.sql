-- ===========================================================================
-- 0010 — Buckets de stockage
-- Aucune vidéo ici : les fichiers vidéo vivent chez le fournisseur (R2,
-- YouTube…). Ce bucket ne reçoit que des documents (20 Mo maximum).
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',    'avatars',    true,  2 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp']),
  ('thumbnails', 'thumbnails', true,  4 * 1024 * 1024,
   array['image/png', 'image/jpeg', 'image/webp', 'image/avif']),
  ('resources',  'resources',  false, 20 * 1024 * 1024, null)
on conflict (id) do nothing;

-- --- avatars : chaque membre n'écrit que dans son propre dossier ----------
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_own_write" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_own_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_own_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- --- thumbnails : lecture publique, écriture staff ------------------------
create policy "thumbnails_public_read" on storage.objects for select
  using (bucket_id = 'thumbnails');

create policy "thumbnails_staff_write" on storage.objects for all to authenticated
  using (bucket_id = 'thumbnails' and public.is_staff())
  with check (bucket_id = 'thumbnails' and public.is_staff());

-- --- resources : privé. La lecture passe par une URL signée générée côté
--     serveur après vérification de l'accès à la formation.
create policy "resources_staff_all" on storage.objects for all to authenticated
  using (bucket_id = 'resources' and public.is_staff())
  with check (bucket_id = 'resources' and public.is_staff());
