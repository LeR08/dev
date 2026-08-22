'use client';

import * as React from 'react';
import { AlertTriangle, Pencil, Play, Plus, Trash2 } from 'lucide-react';
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
import { deleteEntity, reorderEntities, upsertVideo } from '@/server/actions/admin.actions';
import { providerOptions } from '@/lib/video';
import { extractDriveId } from '@/lib/video/providers/google-drive';
import { formatDuration } from '@/lib/utils';
import type { Enums, Tables } from '@/types/database.types';

/**
 * Gestion des vidéos d'une leçon.
 *
 * Le formulaire s'adapte au fournisseur choisi : URL de fichier pour `native`,
 * identifiant externe sinon. Les capacités réelles du fournisseur (reprise,
 * vitesse, suivi) sont affichées telles quelles — un formateur doit savoir ce
 * qu'il perd en choisissant Google Drive.
 */
export function VideoManager({
  lessonId,
  videos,
  onChanged,
}: {
  lessonId: string;
  videos: Tables<'videos'>[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = React.useState<Tables<'videos'> | null>(null);
  const [creating, setCreating] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<Tables<'videos'> | null>(null);

  async function reorder(orderedIds: string[]) {
    const result = await reorderEntities({ entity: 'videos', parentId: lessonId, orderedIds });
    if (!result.ok) {
      toast({ title: 'Réordonnancement impossible', description: result.error, tone: 'error' });
      return;
    }
    onChanged();
  }

  async function handleDelete(video: Tables<'videos'>) {
    const result = await deleteEntity('videos', video.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Vidéo supprimée', tone: 'success' });
    onChanged();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setCreating(true)}>
          <Plus /> Ajouter une vidéo
        </Button>
      </div>

      {videos.length === 0 ? (
        <EmptyState
          icon={Play}
          title="Aucune vidéo"
          description="La base ne stocke que les métadonnées : le fichier reste chez votre fournisseur."
          action={{ label: 'Ajouter une vidéo', onClick: () => setCreating(true) }}
        />
      ) : (
        <SortableList
          items={videos}
          className="space-y-2"
          onReorder={reorder}
          renderItem={(video) => {
            const provider = providerOptions.find((option) => option.value === video.provider);
            const limited = !provider?.capabilities.canTrackTime;

            return (
              <div className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4">
                <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                  <Play className="size-4" aria-hidden />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{video.title}</p>
                  <p className="text-muted-foreground truncate text-xs">
                    {provider?.label}
                    {video.duration_seconds > 0 && ` · ${formatDuration(video.duration_seconds)}`}
                  </p>
                </div>

                {limited && (
                  <Badge variant="warning">
                    <AlertTriangle /> Sans reprise
                  </Badge>
                )}

                <div className="flex gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label="Modifier" onClick={() => setEditing(video)}>
                    <Pencil />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Supprimer" onClick={() => setToDelete(video)}>
                    <Trash2 />
                  </Button>
                </div>
              </div>
            );
          }}
        />
      )}

      {/* `key` force un remontage à chaque ouverture : l'état du formulaire
          repart des props sans effet de synchronisation, qui provoquerait un
          rendu en cascade et un affichage transitoirement périmé. */}
      <VideoDialog
        key={editing?.id ?? (creating ? 'new' : 'closed')}
        open={creating || editing !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCreating(false);
            setEditing(null);
          }
        }}
        lessonId={lessonId}
        video={editing}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={`Supprimer « ${toDelete?.title} » ?`}
        description="La vidéo reste chez votre fournisseur ; seule sa référence est supprimée, avec la progression des membres."
        confirmLabel="Supprimer"
        destructive
        onConfirm={async () => {
          if (toDelete) await handleDelete(toDelete);
        }}
      />
    </div>
  );
}

function VideoDialog({
  open,
  onOpenChange,
  lessonId,
  video,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonId: string;
  video: Tables<'videos'> | null;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const [title, setTitle] = React.useState(video?.title ?? '');
  const [description, setDescription] = React.useState(video?.description ?? '');
  const [provider, setProvider] = React.useState<Enums<'video_provider'>>(
    video?.provider ?? 'native',
  );
  const [externalId, setExternalId] = React.useState(video?.external_id ?? '');
  const [url, setUrl] = React.useState(video?.url ?? '');
  const [thumbnailUrl, setThumbnailUrl] = React.useState(video?.thumbnail_url ?? '');
  const [minutes, setMinutes] = React.useState(
    String(Math.floor((video?.duration_seconds ?? 0) / 60)),
  );
  const [seconds, setSeconds] = React.useState(String((video?.duration_seconds ?? 0) % 60));
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const definition = providerOptions.find((option) => option.value === provider);
  const isNative = provider === 'native';

  async function submit() {
    setPending(true);
    setError(null);

    const result = await upsertVideo({
      id: video?.id,
      lessonId,
      title,
      description,
      provider,
      // Google Drive : on accepte le lien de partage complet et on en extrait l'id.
      externalId: provider === 'google_drive' ? extractDriveId(externalId) : externalId,
      url,
      thumbnailUrl,
      durationSeconds: Number(minutes) * 60 + Number(seconds),
      sortOrder: video?.sort_order ?? 0,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Vidéo enregistrée', tone: 'success' });
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{video ? 'Modifier la vidéo' : 'Ajouter une vidéo'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Titre" htmlFor="video-title" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </Field>

          <Field label="Fournisseur" htmlFor="video-provider" hint={definition?.hint}>
            <Select value={provider} onValueChange={(value) => setProvider(value as Enums<'video_provider'>)}>
              <SelectTrigger id="video-provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {providerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {definition && (
            <div className="bg-muted grid grid-cols-2 gap-2 rounded-lg p-3 text-xs sm:grid-cols-4">
              <Capability label="Reprise" enabled={definition.capabilities.canSeek} />
              <Capability label="Suivi" enabled={definition.capabilities.canTrackTime} />
              <Capability label="Vitesse" enabled={definition.capabilities.canSetRate} />
              <Capability label="Volume" enabled={definition.capabilities.canSetVolume} />
            </div>
          )}

          {isNative ? (
            <Field
              label="URL du fichier"
              htmlFor="video-url"
              required
              hint="Fichier .mp4 ou manifeste .m3u8 accessible publiquement (Cloudflare R2, Bunny…)."
            >
              <Input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder="https://media.exemple.com/lecon-01.mp4"
              />
            </Field>
          ) : (
            <Field
              label="Identifiant externe"
              htmlFor="video-external"
              required
              hint={
                provider === 'google_drive'
                  ? "Identifiant du fichier ou lien de partage complet — l'identifiant sera extrait automatiquement."
                  : provider === 'youtube'
                    ? "Les 11 caractères après « v= » dans l'URL YouTube."
                    : "Identifiant fourni par la plateforme."
              }
            >
              <Input
                value={externalId}
                onChange={(event) => setExternalId(event.target.value)}
                placeholder={provider === 'youtube' ? 'dQw4w9WgXcQ' : '1a2B3c…'}
              />
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Durée" htmlFor="video-minutes" hint="Minutes et secondes.">
              <div className="flex gap-2">
                <Input
                  id="video-minutes"
                  type="number"
                  min={0}
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  aria-label="Minutes"
                />
                <Input
                  type="number"
                  min={0}
                  max={59}
                  value={seconds}
                  onChange={(event) => setSeconds(event.target.value)}
                  aria-label="Secondes"
                />
              </div>
            </Field>

            <Field label="Miniature" htmlFor="video-thumbnail" hint="Facultatif.">
              <Input
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>

          <Field label="Description" htmlFor="video-description">
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

function Capability({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <span className={enabled ? 'text-success' : 'text-muted-foreground'}>
      {enabled ? '✓' : '✕'} {label}
    </span>
  );
}
