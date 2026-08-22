import type { Metadata } from 'next';
import { PageHeader } from '@/components/shared/page-header';
import { Alert } from '@/components/ui/alert';
import { TreeEditor } from '@/components/admin/tree-editor';
import { getAdminTreeRoots } from '@/server/db/admin';
import { requireStaff } from '@/server/auth/guards';

export const metadata: Metadata = {
  title: 'Arborescence',
  robots: { index: false, follow: false },
};

export default async function AdminTreePage() {
  await requireStaff();
  const levels = await getAdminTreeRoots();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Arborescence du catalogue"
        description="Parcours → Domaine → Formation → Module → Chapitre → Leçon. Glissez pour réordonner."
      />

      <Alert variant="info">
        L&apos;ordre se modifie par glisser-déposer, à la souris comme au clavier (Tab jusqu&apos;à
        la poignée, puis Espace et les flèches). Chaque déplacement est enregistré immédiatement.
      </Alert>

      <TreeEditor levels={levels} />
    </div>
  );
}
