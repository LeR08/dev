import type { PlayerCapabilities, ProviderDefinition } from '../types';
import { NativeLikeAdapterFactory } from './hls-like';

/**
 * Cloudflare Stream. Service payant, prévu pour plus tard : la déclaration
 * existe pour que la migration soit une simple mise à jour de la colonne
 * `provider` en base, sans toucher au code applicatif.
 *
 * Stream expose un manifeste HLS lisible directement par <video> sur Safari
 * et par hls.js ailleurs — on réutilise donc l'adaptateur natif.
 */
const capabilities: PlayerCapabilities = {
  canSeek: true,
  canTrackTime: true,
  canSetRate: true,
  canSetVolume: true,
  hasNativeFullscreen: false,
};

export const cloudflareStreamProvider: ProviderDefinition = {
  id: 'cloudflare_stream',
  label: 'Cloudflare Stream',
  capabilities,
  embedded: false,
  resolveUrl: (video) =>
    video.url ??
    `https://customer-${process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER ?? ''}.cloudflarestream.com/${video.external_id}/manifest/video.m3u8`,
  defaultThumbnail: (video) =>
    video.external_id
      ? `https://customer-${process.env.NEXT_PUBLIC_CF_STREAM_CUSTOMER ?? ''}.cloudflarestream.com/${video.external_id}/thumbnails/thumbnail.jpg`
      : null,
  createAdapter: NativeLikeAdapterFactory,
  adminHint: 'Identifiant de la vidéo Cloudflare Stream. Service payant, non requis en v1.',
};
