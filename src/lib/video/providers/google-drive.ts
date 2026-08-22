import type { PlayerAdapter, PlayerCapabilities, ProviderDefinition, VideoSource } from '../types';
import { EventBus } from './base';

/**
 * Google Drive.
 *
 * LIMITE RÉELLE, ASSUMÉE : l'iframe /preview de Drive n'expose aucune API
 * JavaScript. Impossible de connaître la position de lecture, de la modifier
 * ou de changer la vitesse. Ce fournisseur est donc utilisable pour démarrer
 * sans rien héberger, mais il désactive la reprise automatique et le suivi de
 * progression — l'interface le signale et bascule sur « Marquer comme terminé ».
 *
 * Pour un lecteur complet : utiliser `native` (Cloudflare R2) ou `youtube`.
 */
const capabilities: PlayerCapabilities = {
  canSeek: false,
  canTrackTime: false,
  canSetRate: false,
  canSetVolume: false,
  hasNativeFullscreen: true,
};

class GoogleDriveAdapter implements PlayerAdapter {
  readonly capabilities = capabilities;
  private bus = new EventBus();

  async mount(container: HTMLElement, source: VideoSource): Promise<void> {
    const iframe = document.createElement('iframe');
    iframe.src = source.playbackUrl;
    iframe.className = 'h-full w-full border-0 bg-black';
    iframe.allow = 'autoplay; fullscreen';
    iframe.allowFullscreen = true;
    iframe.title = source.title;
    container.replaceChildren(iframe);
    this.bus.emit('ready');
  }

  // Aucune de ces commandes n'est disponible : l'UI ne les affiche pas, mais
  // les méthodes existent pour respecter le contrat PlayerAdapter.
  play() {}
  pause() {}
  seek() {}
  getCurrentTime() { return 0; }
  getDuration() { return 0; }
  setPlaybackRate() {}
  setVolume() {}
  setMuted() {}
  isPaused() { return true; }
  destroy() { this.bus.clear(); }

  on(event: Parameters<EventBus['on']>[0], handler: (payload?: unknown) => void) {
    return this.bus.on(event, handler);
  }
}

/** Accepte aussi bien un identifiant brut qu'une URL Drive complète. */
export function extractDriveId(input: string): string {
  const byPath = input.match(/\/file\/d\/([\w-]+)/);
  if (byPath) return byPath[1];
  const byQuery = input.match(/[?&]id=([\w-]+)/);
  if (byQuery) return byQuery[1];
  return input.trim();
}

export const googleDriveProvider: ProviderDefinition = {
  id: 'google_drive',
  label: 'Google Drive (contrôles limités)',
  capabilities,
  embedded: true,
  resolveUrl: (video) =>
    `https://drive.google.com/file/d/${extractDriveId(video.external_id ?? '')}/preview`,
  createAdapter: () => new GoogleDriveAdapter(),
  adminHint:
    "Identifiant du fichier ou lien de partage complet, avec l'accès réglé sur « Tous les utilisateurs disposant du lien ». Attention : Drive ne permet ni la reprise de lecture, ni le réglage de vitesse, ni le suivi de progression.",
};
