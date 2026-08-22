import type { MetadataRoute } from 'next';
import { createClient } from '@/lib/supabase/server';
import { env } from '@/lib/env';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.siteUrl();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: base, lastModified: new Date(), changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/register`, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/login`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/legal/mentions`, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/legal/confidentialite`, changeFrequency: 'yearly', priority: 0.2 },
  ];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from('courses')
      .select('slug, updated_at')
      .eq('status', 'published')
      .order('updated_at', { ascending: false })
      .limit(500);

    const courseEntries: MetadataRoute.Sitemap = (data ?? []).map((course) => ({
      url: `${base}/courses/${course.slug}`,
      lastModified: new Date(course.updated_at),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));

    return [...staticEntries, ...courseEntries];
  } catch {
    // La base peut être injoignable au moment du build : le sitemap statique
    // vaut mieux qu'un échec de build.
    return staticEntries;
  }
}
