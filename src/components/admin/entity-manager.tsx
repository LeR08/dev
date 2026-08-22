'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { deleteEntity, reorderEntities } from '@/server/actions/admin.actions';
import { slugify } from '@/lib/utils';
import type { ActionResult } from '@/server/actions/action-result';
import { Layers } from 'lucide-react';

export interface EntityRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon?: string | null;
  color?: string | null;
  status: 'draft' | 'published' | 'archived';
  sort_order: number;
  usageCount?: number;
}

/**
 * Gestion des parcours et des domaines : deux entités de forme identique.
 * Un seul composant plutôt que deux écrans jumeaux à maintenir en parallèle.
 */
export function EntityManager({
  entity,
  rows,
  singular,
  withAppearance = false,
  usageLabel,
  onSave,
}: {
  entity: 'levels' | 'subjects';
  rows: EntityRow[];
  singular: string;
  withAppearance?: boolean;
  usageLabel?: string;
  onSave: (input: unknown) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<EntityRow | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<EntityRow | null>(null);

  async function handleReorder(orderedIds: string[]) {
    const result = await reorderEntities({ entity, parentId: null, orderedIds });
    if (!result.ok) {
      toast({ title: 'Réordonnancement impossible', description: result.error, tone: 'error' });
      return;
    }
    router.refresh();
  }

  async function handleDelete(row: EntityRow) {
    const result = await deleteEntity(entity, row.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: `${singular} supprimé`, tone: 'success' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Nouveau {singular.toLowerCase()}
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Layers}
          title={`Aucun ${singular.toLowerCase()}`}
          description="Créez le premier élément pour structurer votre catalogue."
          action={{ label: `Créer un ${singular.toLowerCase()}`, onClick: () => setCreating(true) }}
        />
      ) : (
        <SortableList
          items={rows}
          className="space-y-2"
          onReorder={handleReorder}
          renderItem={(row) => (
            <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4">
              {withAppearance && row.color && (
                <span
                  className="size-4 shrink-0 rounded-full border"
                  style={{ background: row.color }}
                  aria-hidden
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{row.name}</p>
                <p className="text-muted-foreground truncate text-xs">
                  /{row.slug}
                  {row.description ? ` · ${row.description}` : ''}
                </p>
              </div>

              {typeof row.usageCount === 'number' && (
                <Badge variant="outline">
                  {row.usageCount} {usageLabel ?? 'formation(s)'}
                </Badge>
              )}
              <Badge variant={row.status === 'published' ? 'success' : 'default'}>
                {row.status === 'published' ? 'Publié' : row.status === 'draft' ? 'Brouillon' : 'Archivé'}
              </Badge>

              <div className="flex gap-1">
                <Button size="icon-sm" variant="ghost" aria-label="Modifier" onClick={() => setEditing(row)}>
                  <Pencil />
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label="Supprimer" onClick={() => setToDelete(row)}>
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
      <EntityDialog
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        row={editing}
        singular={singular}
        withAppearance={withAppearance}
        onSave={onSave}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Supprimer « ${toDelete?.name} » ?`}
        description="Cette action est définitive. Elle échouera si des formations y sont encore rattachées."
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await handleDelete(toDelete);
        }}
      />
    </div>
  );
}

function EntityDialog({
  open,
  onOpenChange,
  row,
  singular,
  withAppearance,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: EntityRow | null;
  singular: string;
  withAppearance: boolean;
  onSave: (input: unknown) => Promise<ActionResult<{ id: string }>>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = React.useState(row?.name ?? '');
  const [slug, setSlug] = React.useState(row?.slug ?? '');
  const [slugTouched, setSlugTouched] = React.useState(Boolean(row));
  const [description, setDescription] = React.useState(row?.description ?? '');
  const [icon, setIcon] = React.useState(row?.icon ?? '');
  const [color, setColor] = React.useState(row?.color ?? '');
  const [status, setStatus] = React.useState(row?.status ?? 'published');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const result = await onSave({
      id: row?.id,
      name,
      slug: slug || slugify(name),
      description,
      icon: withAppearance ? icon : undefined,
      color: withAppearance ? color : undefined,
      status,
      sortOrder: row?.sort_order ?? 0,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: `${singular} enregistré`, tone: 'success' });
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {row ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`}
          </DialogTitle>
          <DialogDescription>
            Le slug apparaît dans les URL. Il se génère automatiquement à partir du nom.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Nom" htmlFor="name" required>
            <Input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!slugTouched) setSlug(slugify(event.target.value));
              }}
            />
          </Field>

          <Field label="Slug" htmlFor="slug" required hint="Minuscules, chiffres et tirets.">
            <Input
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
            />
          </Field>

          <Field label="Description" htmlFor="description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          {withAppearance && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Icône" htmlFor="icon" hint="Nom d'icône lucide, ex. target">
                <Input value={icon} onChange={(event) => setIcon(event.target.value)} />
              </Field>
              <Field label="Couleur d'accent" htmlFor="color" hint="ex. oklch(0.62 0.19 265)">
                <Input value={color} onChange={(event) => setColor(event.target.value)} />
              </Field>
            </div>
          )}

          <Field label="Statut" htmlFor="status">
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Brouillon</SelectItem>
                <SelectItem value="published">Publié</SelectItem>
                <SelectItem value="archived">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={submit} loading={pending} disabled={name.trim().length === 0}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
