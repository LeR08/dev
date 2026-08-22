'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, FolderOpen, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field } from '@/components/shared/field';
import { EmptyState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SortableList } from './sortable-list';
import { useToast } from '@/components/ui/toast';
import {
  deleteEntity,
  reorderEntities,
  upsertChapter,
  upsertLesson,
  upsertModule,
} from '@/server/actions/admin.actions';
import { routes } from '@/lib/constants/routes';
import { cn, formatDuration, slugify } from '@/lib/utils';
import type { TreeModule } from '@/server/db/admin';

type DialogState =
  | { kind: 'module'; parentId: string; id?: string; title?: string; description?: string }
  | { kind: 'chapter'; parentId: string; id?: string; title?: string; description?: string }
  | { kind: 'lesson'; parentId: string; id?: string; title?: string }
  | null;

const LABELS = { module: 'module', chapter: 'chapitre', lesson: 'leçon' } as const;

/** Construction de la structure d'une formation : modules → chapitres → leçons. */
export function CourseStructure({
  courseId,
  modules,
}: {
  courseId: string;
  modules: TreeModule[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [dialog, setDialog] = React.useState<DialogState>(null);
  const [toDelete, setToDelete] = React.useState<{
    entity: 'modules' | 'chapters' | 'lessons';
    id: string;
    label: string;
  } | null>(null);
  const [openModules, setOpenModules] = React.useState<Set<string>>(
    () => new Set(modules.map((module) => module.id)),
  );

  async function reorder(entity: string, parentId: string, orderedIds: string[]) {
    const result = await reorderEntities({ entity, parentId, orderedIds });
    if (!result.ok) {
      toast({ title: 'Réordonnancement impossible', description: result.error, tone: 'error' });
      return;
    }
    router.refresh();
  }

  async function handleDelete() {
    if (!toDelete) return;
    const result = await deleteEntity(toDelete.entity, toDelete.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Élément supprimé', tone: 'success' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setDialog({ kind: 'module', parentId: courseId })}>
          <Plus /> Ajouter un module
        </Button>
      </div>

      {modules.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Aucun module"
          description="Une formation se découpe en modules, eux-mêmes découpés en chapitres puis en leçons."
          action={{
            label: 'Créer le premier module',
            onClick: () => setDialog({ kind: 'module', parentId: courseId }),
          }}
        />
      ) : (
        <SortableList
          items={modules}
          className="space-y-3"
          onReorder={(ids) => reorder('modules', courseId, ids)}
          renderItem={(module, index) => {
            const open = openModules.has(module.id);
            return (
              <div className="bg-card overflow-hidden rounded-xl border">
                <div className="flex items-center gap-2 px-4 py-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenModules((current) => {
                        const next = new Set(current);
                        if (next.has(module.id)) next.delete(module.id);
                        else next.add(module.id);
                        return next;
                      })
                    }
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronRight className={cn('size-4 shrink-0 transition-transform', open && 'rotate-90')} />
                    <span className="truncate text-sm font-medium">
                      Module {index + 1} — {module.title}
                    </span>
                  </button>

                  <span className="text-muted-foreground shrink-0 text-xs">
                    {module.chapters.length} chapitre(s)
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Modifier le module"
                    onClick={() =>
                      setDialog({ kind: 'module', parentId: courseId, id: module.id, title: module.title })
                    }
                  >
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer le module"
                    onClick={() => setToDelete({ entity: 'modules', id: module.id, label: module.title })}
                  >
                    <Trash2 />
                  </Button>
                </div>

                {open && (
                  <div className="space-y-3 border-t px-4 py-3">
                    <SortableList
                      items={module.chapters}
                      className="space-y-3"
                      onReorder={(ids) => reorder('chapters', module.id, ids)}
                      renderItem={(chapter) => (
                        <div className="rounded-lg border p-3">
                          <div className="flex items-center gap-2">
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {chapter.title}
                            </span>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Modifier le chapitre"
                              onClick={() =>
                                setDialog({
                                  kind: 'chapter',
                                  parentId: module.id,
                                  id: chapter.id,
                                  title: chapter.title,
                                })
                              }
                            >
                              <Pencil />
                            </Button>
                            <Button
                              size="icon-sm"
                              variant="ghost"
                              aria-label="Supprimer le chapitre"
                              onClick={() =>
                                setToDelete({ entity: 'chapters', id: chapter.id, label: chapter.title })
                              }
                            >
                              <Trash2 />
                            </Button>
                          </div>

                          <div className="mt-2 space-y-1 pl-1">
                            <SortableList
                              items={chapter.lessons}
                              className="space-y-0.5"
                              onReorder={(ids) => reorder('lessons', chapter.id, ids)}
                              renderItem={(lesson) => (
                                <div className="hover:bg-muted flex items-center gap-2 rounded-md px-2 py-1.5">
                                  <Link
                                    href={routes.adminLesson(lesson.id)}
                                    className="hover:text-primary min-w-0 flex-1 truncate text-sm transition-colors"
                                  >
                                    {lesson.title}
                                  </Link>
                                  {lesson.isFreePreview && <Badge variant="primary">Gratuit</Badge>}
                                  {lesson.status !== 'published' && (
                                    <Badge variant="warning">Brouillon</Badge>
                                  )}
                                  {lesson.durationSeconds > 0 && (
                                    <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                                      {formatDuration(lesson.durationSeconds)}
                                    </span>
                                  )}
                                  <Button
                                    size="icon-sm"
                                    variant="ghost"
                                    aria-label="Supprimer la leçon"
                                    onClick={() =>
                                      setToDelete({ entity: 'lessons', id: lesson.id, label: lesson.title })
                                    }
                                  >
                                    <Trash2 />
                                  </Button>
                                </div>
                              )}
                            />

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDialog({ kind: 'lesson', parentId: chapter.id })}
                            >
                              <Plus /> Ajouter une leçon
                            </Button>
                          </div>
                        </div>
                      )}
                    />

                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDialog({ kind: 'chapter', parentId: module.id })}
                    >
                      <Plus /> Ajouter un chapitre
                    </Button>
                  </div>
                )}
              </div>
            );
          }}
        />
      )}

      {/* `key` force un remontage à chaque ouverture : l'état du formulaire
          repart des props sans effet de synchronisation, qui provoquerait un
          rendu en cascade et un affichage transitoirement périmé. */}
      <StructureDialog
        key={dialog ? `${dialog.kind}-${dialog.id ?? 'new'}-${dialog.parentId}` : 'closed'}
        state={dialog}
        onClose={() => setDialog(null)}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Supprimer « ${toDelete?.label} » ?`}
        description="Tout son contenu sera supprimé, ainsi que la progression associée. Cette action est définitive."
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function StructureDialog({ state, onClose }: { state: DialogState; onClose: () => void }) {
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = React.useState(state?.title ?? '');
  const [description, setDescription] = React.useState(
    (state && 'description' in state ? state.description : '') ?? '',
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    if (!state) return;
    setPending(true);
    setError(null);

    const result =
      state.kind === 'module'
        ? await upsertModule({ id: state.id, parentId: state.parentId, title, description })
        : state.kind === 'chapter'
          ? await upsertChapter({ id: state.id, parentId: state.parentId, title, description })
          : await upsertLesson({
              id: state.id,
              chapterId: state.parentId,
              slug: slugify(title) || `lecon-${Date.now()}`,
              title,
            });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Enregistré', tone: 'success' });
    onClose();
    router.refresh();
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {state?.id ? 'Modifier' : 'Ajouter'} {state ? LABELS[state.kind] : ''}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Titre" htmlFor="structure-title" required>
            <Input
              value={title}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && title.trim()) void submit();
              }}
            />
          </Field>

          {state?.kind !== 'lesson' && (
            <Field label="Description" htmlFor="structure-description">
              <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
            </Field>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={pending} disabled={title.trim().length === 0}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
