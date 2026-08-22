'use client';

import * as React from 'react';
import { Clock, NotebookPen, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { createNote, deleteNote, updateNote } from '@/server/actions/engagement.actions';
import { formatTimecode, formatRelative } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

/**
 * Notes personnelles d'une leçon, horodatées sur la vidéo quand c'est possible.
 * Cliquer sur un horodatage repositionne le lecteur.
 */
export function NotePanel({
  lessonId,
  videoId,
  initialNotes,
  getCurrentTime,
  onSeek,
  canTimestamp,
}: {
  lessonId: string;
  videoId: string | null;
  initialNotes: Tables<'notes'>[];
  getCurrentTime?: () => number;
  onSeek?: (seconds: number) => void;
  canTimestamp: boolean;
}) {
  const { toast } = useToast();
  const [notes, setNotes] = React.useState(initialNotes);
  const [draft, setDraft] = React.useState('');
  const [withTimestamp, setWithTimestamp] = React.useState(canTimestamp);
  const [pending, setPending] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingValue, setEditingValue] = React.useState('');
  const [toDelete, setToDelete] = React.useState<string | null>(null);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (draft.trim().length === 0) return;

    setPending(true);
    const timestamp = withTimestamp && getCurrentTime ? Math.floor(getCurrentTime()) : null;

    const result = await createNote({
      lessonId,
      videoId: withTimestamp ? videoId : null,
      timestampSeconds: timestamp,
      content: draft.trim(),
    });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Enregistrement impossible', description: result.error, tone: 'error' });
      return;
    }

    setNotes((current) => [
      ...current,
      {
        id: result.data.id,
        user_id: '',
        lesson_id: lessonId,
        video_id: withTimestamp ? videoId : null,
        timestamp_seconds: timestamp,
        content: draft.trim(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]);
    setDraft('');
    toast({ title: 'Note enregistrée', tone: 'success' });
  }

  async function handleUpdate(id: string) {
    setPending(true);
    const result = await updateNote(id, editingValue);
    setPending(false);
    if (!result.ok) {
      toast({ title: 'Modification impossible', description: result.error, tone: 'error' });
      return;
    }
    setNotes((current) =>
      current.map((note) => (note.id === id ? { ...note, content: editingValue } : note)),
    );
    setEditingId(null);
  }

  async function handleDelete(id: string) {
    const result = await deleteNote(id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    setNotes((current) => current.filter((note) => note.id !== id));
    toast({ title: 'Note supprimée', tone: 'success' });
  }

  const sorted = [...notes].sort((a, b) => {
    if (a.timestamp_seconds === null && b.timestamp_seconds === null) {
      return a.created_at.localeCompare(b.created_at);
    }
    if (a.timestamp_seconds === null) return 1;
    if (b.timestamp_seconds === null) return -1;
    return a.timestamp_seconds - b.timestamp_seconds;
  });

  return (
    <div className="space-y-5">
      <form onSubmit={handleCreate} className="space-y-2.5">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Notez une idée, une formule, une question à creuser…"
          rows={3}
          maxLength={5000}
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          {canTimestamp ? (
            <label className="text-muted-foreground flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withTimestamp}
                onChange={(event) => setWithTimestamp(event.target.checked)}
                className="accent-primary size-4"
              />
              Lier à la position actuelle
              {withTimestamp && getCurrentTime && (
                <Badge variant="primary">{formatTimecode(getCurrentTime())}</Badge>
              )}
            </label>
          ) : (
            <span className="text-muted-foreground text-xs">
              Horodatage indisponible avec ce lecteur.
            </span>
          )}
          <Button type="submit" size="sm" loading={pending} disabled={draft.trim().length === 0}>
            Ajouter la note
          </Button>
        </div>
      </form>

      {sorted.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Aucune note sur cette leçon"
          description="Vos notes restent privées et sont regroupées dans « Mes notes »."
        />
      ) : (
        <ul className="space-y-2">
          {sorted.map((note) => (
            <li key={note.id} className="bg-card group rounded-xl border p-3.5">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <Textarea
                    value={editingValue}
                    onChange={(event) => setEditingValue(event.target.value)}
                    rows={3}
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X /> Annuler
                    </Button>
                    <Button size="sm" loading={pending} onClick={() => handleUpdate(note.id)}>
                      Enregistrer
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    {note.timestamp_seconds !== null && (
                      <button
                        type="button"
                        onClick={() => onSeek?.(note.timestamp_seconds!)}
                        disabled={!onSeek}
                        className="bg-primary-muted text-primary inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums transition-opacity enabled:hover:opacity-80 disabled:cursor-default"
                      >
                        <Clock className="size-3" aria-hidden />
                        {formatTimecode(note.timestamp_seconds)}
                      </button>
                    )}
                    <p className="min-w-0 flex-1 text-sm break-words whitespace-pre-wrap">
                      {note.content}
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {formatRelative(note.created_at)}
                    </span>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Modifier la note"
                        onClick={() => {
                          setEditingId(note.id);
                          setEditingValue(note.content);
                        }}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        aria-label="Supprimer la note"
                        onClick={() => setToDelete(note.id)}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
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
