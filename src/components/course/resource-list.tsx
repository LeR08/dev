import {
  Download,
  ExternalLink,
  FileArchive,
  FileImage,
  FileText,
  Link2,
  Paperclip,
  type LucideIcon,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/states';
import { formatNumber } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

const icons: Record<Tables<'resources'>['type'], LucideIcon> = {
  pdf: FileText,
  document: FileText,
  image: FileImage,
  link: Link2,
  file: Paperclip,
  archive: FileArchive,
};

const labels: Record<Tables<'resources'>['type'], string> = {
  pdf: 'PDF',
  document: 'Document',
  image: 'Image',
  link: 'Lien',
  file: 'Fichier',
  archive: 'Archive',
};

/**
 * Les fichiers privés sont servis par une URL signée générée côté serveur ;
 * `href` est déjà résolu par l'appelant.
 */
export function ResourceList({
  resources,
}: {
  resources: Array<Tables<'resources'> & { href: string }>;
}) {
  if (resources.length === 0) {
    return (
      <EmptyState
        icon={Paperclip}
        title="Aucune ressource pour cette leçon"
        description="Les modèles, checklists et fiches apparaîtront ici quand ils seront disponibles."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {resources.map((resource) => {
        const Icon = icons[resource.type];
        const external = resource.type === 'link';
        return (
          <li key={resource.id}>
            <a
              href={resource.href}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-card hover:border-primary/40 group flex items-center gap-3 rounded-xl border p-3.5 transition-colors"
            >
              <span className="bg-muted text-muted-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                <Icon className="size-4.5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="group-hover:text-primary block truncate text-sm font-medium transition-colors">
                  {resource.title}
                </span>
                <span className="text-muted-foreground block truncate text-xs">
                  {labels[resource.type]}
                  {resource.file_size ? ` · ${formatNumber(Math.round(resource.file_size / 1024))} Ko` : ''}
                  {resource.description ? ` · ${resource.description}` : ''}
                </span>
              </span>
              {external ? (
                <ExternalLink className="text-muted-foreground size-4 shrink-0" aria-hidden />
              ) : (
                <Download className="text-muted-foreground size-4 shrink-0" aria-hidden />
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
