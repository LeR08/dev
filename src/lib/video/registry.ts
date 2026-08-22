import type { ProviderDefinition, VideoProviderId, VideoRow, VideoSource } from './types';
import { nativeProvider } from './providers/native';
import { youtubeProvider } from './providers/youtube';
import { googleDriveProvider } from './providers/google-drive';
import { cloudflareStreamProvider } from './providers/cloudflare-stream';
import { vimeoProvider } from './providers/vimeo';

/**
 * Point d'extension unique de l'architecture vidéo.
 * Ajouter un fournisseur = un fichier dans providers/ + une entrée ici.
 */
export const providers: Record<VideoProviderId, ProviderDefinition> = {
  native: nativeProvider,
  youtube: youtubeProvider,
  google_drive: googleDriveProvider,
  cloudflare_stream: cloudflareStreamProvider,
  vimeo: vimeoProvider,
};

export function getProvider(id: VideoProviderId): ProviderDefinition {
  return providers[id] ?? nativeProvider;
}

/** Liste destinée aux sélecteurs de l'administration. */
export const providerOptions = Object.values(providers).map((provider) => ({
  value: provider.id,
  label: provider.label,
  hint: provider.adminHint,
  capabilities: provider.capabilities,
}));

/** Traduit une ligne `videos` en source normalisée, prête pour le lecteur. */
export function resolveVideoSource(video: VideoRow): VideoSource {
  const provider = getProvider(video.provider);
  return {
    id: video.id,
    title: video.title,
    provider: provider.id,
    playbackUrl: provider.resolveUrl(video),
    externalId: video.external_id,
    thumbnailUrl: video.thumbnail_url ?? provider.defaultThumbnail?.(video) ?? null,
    durationSeconds: video.duration_seconds,
    capabilities: provider.capabilities,
    embedded: provider.embedded,
  };
}

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** Intervalle de sauvegarde de la position, en millisecondes. */
export const PROGRESS_SAVE_INTERVAL_MS = 10_000;
/** Seuil de complétion automatique d'une vidéo. */
export const COMPLETION_THRESHOLD_PERCENT = 90;
/** En deçà, on ne propose pas de reprendre : ça ne vaut pas la question. */
export const RESUME_MIN_SECONDS = 15;
