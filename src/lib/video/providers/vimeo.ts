import type { PlayerCapabilities, ProviderDefinition } from '../types';
import { NativeLikeAdapterFactory } from './hls-like';

/**
 * Vimeo — emplacement réservé. Non activé en v1 : l'API Player de Vimeo
 * exige son propre SDK. Le jour où il est nécessaire, seul ce fichier change.
 */
const capabilities: PlayerCapabilities = {
  canSeek: false,
  canTrackTime: false,
  canSetRate: false,
  canSetVolume: false,
  hasNativeFullscreen: true,
};

export const vimeoProvider: ProviderDefinition = {
  id: 'vimeo',
  label: 'Vimeo',
  capabilities,
  embedded: true,
  resolveUrl: (video) => `https://player.vimeo.com/video/${video.external_id ?? ''}`,
  createAdapter: NativeLikeAdapterFactory,
  adminHint: 'Identifiant numérique de la vidéo Vimeo. Intégration complète non activée en v1.',
};
