import type { Enums, Tables } from '@/types/database.types';

export type VideoProviderId = Enums<'video_provider'>;

/**
 * Ce qu'un fournisseur sait réellement faire.
 *
 * Tous les fournisseurs ne se valent pas : Google Drive en iframe /preview
 * n'expose AUCUN contrôle JavaScript. Prétendre le contraire produirait un
 * lecteur avec des boutons qui ne font rien. L'interface s'adapte à ces
 * capacités au lieu de les supposer.
 */
export interface PlayerCapabilities {
  /** Positionner la lecture — condition de la reprise automatique. */
  canSeek: boolean;
  /** Connaître la position courante — condition du suivi de progression. */
  canTrackTime: boolean;
  /** Vitesse de lecture 0.5× à 2×. */
  canSetRate: boolean;
  canSetVolume: boolean;
  /** Le fournisseur gère lui-même le plein écran (iframe). */
  hasNativeFullscreen: boolean;
}

export interface VideoSource {
  id: string;
  title: string;
  provider: VideoProviderId;
  /** URL de lecture résolue, prête pour <video src> ou <iframe src>. */
  playbackUrl: string;
  externalId: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number;
  capabilities: PlayerCapabilities;
  /** true quand le rendu passe par une iframe tierce. */
  embedded: boolean;
}

export type PlayerEvent =
  | 'ready'
  | 'play'
  | 'pause'
  | 'timeupdate'
  | 'durationchange'
  | 'ended'
  | 'error'
  | 'ratechange'
  | 'volumechange'
  | 'waiting'
  | 'playing';

export interface MountOptions {
  /** Position de départ, en secondes (reprise de lecture). */
  startAt?: number;
  autoplay?: boolean;
  muted?: boolean;
}

/**
 * Contrat unique implémenté par chaque fournisseur.
 * Ajouter Cloudflare Stream = créer un fichier dans providers/ et une ligne
 * dans registry.ts. Aucun composant ni aucune table ne change.
 */
export interface PlayerAdapter {
  readonly capabilities: PlayerCapabilities;
  mount(container: HTMLElement, source: VideoSource, options: MountOptions): Promise<void>;
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  isPaused(): boolean;
  destroy(): void;
  on(event: PlayerEvent, handler: (payload?: unknown) => void): () => void;
}

export type VideoRow = Tables<'videos'>;

export interface ProviderDefinition {
  id: VideoProviderId;
  label: string;
  capabilities: PlayerCapabilities;
  embedded: boolean;
  /** Construit l'URL de lecture à partir de la ligne en base. */
  resolveUrl(video: Pick<VideoRow, 'url' | 'external_id'>): string;
  /** Miniature déduite quand aucune n'est fournie. */
  defaultThumbnail?(video: Pick<VideoRow, 'external_id'>): string | null;
  createAdapter(): PlayerAdapter;
  /** Aide affichée dans l'administration au moment d'ajouter une vidéo. */
  adminHint: string;
}
