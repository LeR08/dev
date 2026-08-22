import type { Metadata } from 'next';
import { SearchX } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { CourseGrid } from '@/components/course/course-card';
import { CatalogFilters } from '@/components/course/catalog-filters';
import { CatalogPagination } from '@/components/course/catalog-pagination';
import { getCourseCatalog, getLevels, getSubjects } from '@/server/db/content';
import { routes } from '@/lib/constants/routes';
import type { Enums } from '@/types/database.types';

export const metadata: Metadata = {
  title: 'Explorer les formations',
  description:
    'Le catalogue complet : produit digital, media buying, marketing digital, vente et conversion.',
};

const DIFFICULTIES = ['beginner', 'intermediate', 'advanced'] as const;

function parseDifficulty(value?: string): Enums<'difficulty_level'> | undefined {
  return DIFFICULTIES.includes(value as never) ? (value as Enums<'difficulty_level'>) : undefined;
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const [levels, subjects] = await Promise.all([getLevels(), getSubjects()]);

  const { courses, total, page, pageCount } = await getCourseCatalog({
    levelId: first('level'),
    subjectId: first('subject'),
    difficulty: parseDifficulty(first('difficulty')),
    maxHours: first('duration') ? Number(first('duration')) : undefined,
    search: first('q'),
    page: Number(first('page') ?? 1) || 1,
  });

  return (
    <div className="space-y-7">
      <PageHeader
        title="Explorer"
        description="Toutes les formations, du premier produit digital au scaling de vos campagnes."
      />

      <CatalogFilters levels={levels} subjects={subjects} />

      {courses.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="Aucune formation ne correspond"
          description="Essayez d'élargir vos critères ou de retirer un filtre."
          action={{ label: 'Voir tout le catalogue', href: routes.explore }}
        />
      ) : (
        <div className="space-y-6">
          <p className="text-muted-foreground text-sm">
            {total} formation{total > 1 ? 's' : ''} disponible{total > 1 ? 's' : ''}
          </p>
          <CourseGrid courses={courses} />
          <CatalogPagination page={page} pageCount={pageCount} total={total} />
        </div>
      )}
    </div>
  );
}
