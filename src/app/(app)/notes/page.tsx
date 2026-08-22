import type { Metadata } from 'next';
import { NotebookPen } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { EmptyState } from '@/components/shared/states';
import { AllNotes } from '@/components/notes/all-notes';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { routes } from '@/lib/constants/routes';

export const metadata: Metadata = {
  title: 'Mes notes',
  robots: { index: false, follow: false },
};

export default async function NotesPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from('notes')
    .select(
      `id, content, timestamp_seconds, created_at, lesson_id,
       lesson:lessons!notes_lesson_id_fkey(
         title,
         course:courses!lessons_course_id_fkey(title, slug)
       )`,
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const notes = (data ?? []).map((row) => ({
    id: row.id,
    content: row.content,
    timestampSeconds: row.timestamp_seconds,
    createdAt: row.created_at,
    lessonId: row.lesson_id,
    lessonTitle: row.lesson?.title ?? '',
    courseTitle: row.lesson?.course?.title ?? '',
  }));

  return (
    <div className="space-y-7">
      <PageHeader
        title="Mes notes"
        description="Toutes vos notes, regroupées par formation. Cliquez sur un horodatage pour revenir au bon moment de la vidéo."
      />

      {notes.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Aucune note pour l'instant"
          description="Pendant une leçon, ouvrez l'onglet « Mes notes » pour capturer une idée sans quitter la vidéo."
          action={{ label: 'Reprendre une formation', href: routes.myCourses }}
        />
      ) : (
        <AllNotes notes={notes} />
      )}
    </div>
  );
}
