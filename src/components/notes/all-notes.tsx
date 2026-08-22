'use client';

import * as React from 'react';
import Link from 'next/link';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/shared/search-input';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { EmptyState } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';
import { deleteNote } from '@/server/actions/engagement.actions';
import { routes } from '@/lib/constants/routes';
import { formatRelative, formatTimecode } from '@/lib/utils';
import { NotebookPen } from 'lucide-react';

interface NoteItem {
  id: string;
  content: string;
  timestampSeconds: number | null;
  createdAt: string;
  lessonId: string;
  lessonTitle: string;
  courseTitle: string;
}

export function AllNotes({ notes: initialNotes }: { notes: NoteItem[] }) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState(initialNotes);
  const [search, setSearch] = React.useState('');
  const [toDelete, setToDelete] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return notes;
    return notes.filter(
      (note) =>
        note.content.toLowerCase().includes(query) ||
        note.lessonTitle.toLowerCase().includes(query) ||
        note.courseTitle.toLowerCase().includes(query),
    );
  }, [notes, search]);

  // Regroupement par formation : la vue plate devient illisible au-delà de 20 notes.
  const grouped = React.useMemo(() => {
    const map = new Map<string, NoteItem[]>();
    for (const note of filtered) {
      const key = note.courseTitle || 'Sans formation';
      const list = map.get(key) ?? [];
      list.push(note);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [filtered]);

  async function handleDelete(id: string) {
    const result = await deleteNote(id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    setNotes((current) => current.filter((note) => note.id !== id));
    toast({ title: 'Note supprimée', tone: 'success' });
  }

  return (
    <div className="space-y-6">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="Rechercher dans mes notes…"
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Aucune note ne correspond"
          description="Essayez un autre mot-clé."
        />
      ) : (
        grouped.map(([courseTitle, courseNotes]) => (
          <section key={courseTitle} className="space-y-3">
            <h2 className="text-sm font-semibold">{courseTitle}</h2>
            <ul className="space-y-2">
              {courseNotes.map((note) => (
                <li key={note.id} className="bg-card group rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={routes.lesson(note.lessonId)}
                          className="hover:text-primary truncate text-sm font-medium transition-colors"
                        >
                          {note.lessonTitle}
                        </Link>
                        {note.timestampSeconds !== null && (
                          <Badge variant="primary">
                            <Clock /> {formatTimecode(note.timestampSeconds)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm break-words whitespace-pre-wrap">{note.content}</p>
                      <p className="text-muted-foreground text-xs">
                        {formatRelative(note.createdAt)}
                      </p>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Supprimer la note"
                      className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      onClick={() => setToDelete(note.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer cette note ?"
        description="Cette action est définitive."
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await handleDelete(toDelete);
        }}
      />
    </div>
  );
}
