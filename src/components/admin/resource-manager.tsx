'use client';

import * as React from 'react';
import { Paperclip, Pencil, Plus, Trash2 } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { EmptyState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SortableList } from './sortable-list';
import { useToast } from '@/components/ui/toast';
import { deleteEntity, reorderEntities, upsertResource } from '@/server/actions/admin.actions';
import type { Enums, Tables } from '@/types/database.types';

const TYPES: Array<{ value: Enums<'resource_type'>; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Document (tableur, doc…)' },
  { value: 'image', label: 'Image' },
  { value: 'link', label: 'Lien externe' },
  { value: 'file', label: 'Fichier' },
  { value: 'archive', label: 'Archive' },
];

export function ResourceManager({
  lessonId,
  resources,
  onChanged,
}: {
  lessonId: string;
  resources: Tables<'resources'>[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<Tables<'resources'> | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Tables<'resources'> | null>(null);

  async function reorder(orderedIds: string[]) {
    const result = await reorderEntities({ entity: 'resources', parentId: lessonId, orderedIds });
    if (!result.ok) {
      toast({ title: 'Réordonnancement impossible', description: result.error, tone: 'error' });
      return;
    }
    onChanged();
  }

  async function handleDelete(resource: Tables<'resources'>) {
    const result = await deleteEntity('resources', resource.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Ressource supprimée', tone: 'success' });
    onChanged();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Ajouter une ressource
        </Button>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="Aucune ressource"
          description="Tableurs, checklists, templates, swipe files : c'est souvent ce que les membres téléchargent en premier."
          action={{ label: 'Ajouter une ressource', onClick: () => setCreating(true) }}
        />
      ) : (
        <SortableList
          items={resources}
          className="space-y-2"
          onReorder={reorder}
          renderItem={(resource) => (
            <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4">
              <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <Paperclip className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{resource.title}</p>
                <p className="text-muted-foreground truncate text-xs">
                  {resource.url ?? resource.storage_path}
                </p>
              </div>
              <Badge variant="outline">
                {TYPES.find((type) => type.value === resource.type)?.label ?? resource.type}
              </Badge>
              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="Modifier" onClick={() => setEditing(resource)}>
                  <Pencil />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Supprimer" onClick={() => setToDelete(resource)}>
                  <Trash2 />
                </Button>
              </div>
            </div>
          )}
        />
      )}

      {/* `key` force un remontage à chaque ouverture : l'état du formulaire
          repart des props sans effet de synchronisation, qui provoquerait un
          rendu en cascade et un affichage transitoirement périmé. */}
      <ResourceDialog
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        lessonId={lessonId}
        resource={editing}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Supprimer « ${toDelete?.title} » ?`}
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

function ResourceDialog({
  open,
  onOpenChange,
  lessonId,
  resource,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  resource: Tables<'resources'> | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(resource?.title ?? '');
  const [description, setDescription] = React.useState(resource?.description ?? '');
  const [type, setType] = React.useState<Enums<'resource_type'>>(resource?.type ?? 'pdf');
  const [url, setUrl] = React.useState(resource?.url ?? '');
  const [storagePath, setStoragePath] = React.useState(resource?.storage_path ?? '');
  const [mode, setMode] = React.useState<'url' | 'storage'>(
    resource?.storage_path ? 'storage' : 'url',
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const result = await upsertResource({
      id: resource?.id,
      lessonId,
      courseId: null,
      type,
      title,
      description,
      url: mode === 'url' ? url : '',
      storagePath: mode === 'storage' ? storagePath : '',
      sortOrder: resource?.sort_order ?? 0,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Ressource enregistrée', tone: 'success' });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{resource ? 'Modifier la ressource' : 'Ajouter une ressource'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Titre" htmlFor="resource-title" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </Field>

          <Field label="Type" htmlFor="resource-type">
            <Select value={type} onValueChange={(value) => setType(value as Enums<'resource_type'>)}>
              <SelectTrigger id="resource-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant={mode === 'url' ? 'primary' : 'secondary'}
              onClick={() => setMode('url')}
            >
              Lien externe
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === 'storage' ? 'primary' : 'secondary'}
              onClick={() => setMode('storage')}
            >
              Fichier hébergé
            </Button>
          </div>

          {mode === 'url' ? (
            <Field label="URL" htmlFor="resource-url" required>
              <Input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" />
            </Field>
          ) : (
            <Field
              label="Chemin dans le bucket"
              htmlFor="resource-path"
              required
              hint="Bucket privé « resources ». Le lien de téléchargement est signé à la volée, jamais public."
            >
              <Input
                value={storagePath}
                onChange={(event) => setStoragePath(event.target.value)}
                placeholder="meta-ads/template-structure.xlsx"
              />
            </Field>
          )}

          <Field label="Description" htmlFor="resource-description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
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
