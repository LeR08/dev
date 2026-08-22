import 'server-only';

import { createClient } from '@/lib/supabase/server';
import type { Tables } from '@/types/database.types';

const SIGNED_URL_TTL_SECONDS = 60 * 30;

/**
 * Résout l'URL de téléchargement d'une ressource.
 *
 * Le bucket `resources` est privé : la RLS a déjà filtré les lignes visibles,
 * il ne reste qu'à signer une URL de courte durée. Les liens externes passent
 * tels quels.
 */
export async function withDownloadUrls(
  resources: Tables<'resources'>[],
): Promise<Array<Tables<'resources'> & { href: string }>> {
  if (resources.length === 0) return [];

  const supabase = await createClient();
  const stored = resources.filter((resource) => resource.storage_path);

  const signedByPath = new Map<string, string>();
  if (stored.length > 0) {
    const { data } = await supabase.storage
      .from('resources')
      .createSignedUrls(
        stored.map((resource) => resource.storage_path!),
        SIGNED_URL_TTL_SECONDS,
      );

    for (const entry of data ?? []) {
      if (entry.signedUrl && entry.path) signedByPath.set(entry.path, entry.signedUrl);
    }
  }

  return resources.map((resource) => ({
    ...resource,
    href: resource.storage_path
      ? (signedByPath.get(resource.storage_path) ?? '#')
      : (resource.url ?? '#'),
  }));
}
