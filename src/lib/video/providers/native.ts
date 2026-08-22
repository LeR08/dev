import type { MountOptions, PlayerAdapter, PlayerCapabilities, ProviderDefinition, VideoSource } from '../types';
import { EventBus } from './base';

/**
 * Lecture HTML5 native : MP4 ou HLS servi depuis n'importe quel stockage
 * objet (Cloudflare R2, Bunny, S3…). C'est le seul fournisseur qui autorise
 * un lecteur entièrement maison — contrôles, vitesse, reprise, tout.
 */
const capabilities: PlayerCapabilities = {
  canSeek: true,
  canTrackTime: true,
  canSetRate: true,
  canSetVolume: true,
  hasNativeFullscreen: false,
};

class NativeAdapter implements PlayerAdapter {
  readonly capabilities = capabilities;
  private bus = new EventBus();
  private video: HTMLVideoElement | null = null;
  private cleanups: Array<() => void> = [];

  async mount(container: HTMLElement, source: VideoSource, options: MountOptions): Promise<void> {
    const video = document.createElement('video');
    video.src = source.playbackUrl;
    video.className = 'h-full w-full bg-black object-contain';
    video.playsInline = true;
    video.preload = 'metadata';
    video.controls = false;
    if (source.thumbnailUrl) video.poster = source.thumbnailUrl;
    if (options.muted) video.muted = true;

    container.replaceChildren(video);
    this.video = video;

    const forward = (domEvent: string, playerEvent: Parameters<EventBus['emit']>[0]) => {
      const handler = () => this.bus.emit(playerEvent);
      video.addEventListener(domEvent, handler);
      this.cleanups.push(() => video.removeEventListener(domEvent, handler));
    };

    forward('play', 'play');
    forward('pause', 'pause');
    forward('timeupdate', 'timeupdate');
    forward('durationchange', 'durationchange');
    forward('ended', 'ended');
    forward('error', 'error');
    forward('ratechange', 'ratechange');
    forward('volumechange', 'volumechange');
    forward('waiting', 'waiting');
    forward('playing', 'playing');

    await new Promise<void>((resolve) => {
      const onReady = () => {
        // Reprise : positionner APRÈS le chargement des métadonnées, sinon
        // currentTime est ignoré silencieusement.
        if (options.startAt && options.startAt > 0) {
          video.currentTime = options.startAt;
        }
        this.bus.emit('ready');
        resolve();
      };
      if (video.readyState >= 1) onReady();
      else video.addEventListener('loadedmetadata', onReady, { once: true });
    });

    if (options.autoplay) {
      // Peut être refusé par le navigateur sans interaction : on n'insiste pas.
      void video.play().catch(() => undefined);
    }
  }

  play() { void this.video?.play().catch(() => undefined); }
  pause() { this.video?.pause(); }
  seek(seconds: number) { if (this.video) this.video.currentTime = Math.max(0, seconds); }
  getCurrentTime() { return this.video?.currentTime ?? 0; }
  getDuration() { return Number.isFinite(this.video?.duration) ? (this.video?.duration ?? 0) : 0; }
  setPlaybackRate(rate: number) { if (this.video) this.video.playbackRate = rate; }
  setVolume(volume: number) { if (this.video) this.video.volume = Math.min(1, Math.max(0, volume)); }
  setMuted(muted: boolean) { if (this.video) this.video.muted = muted; }
  isPaused() { return this.video?.paused ?? true; }

  destroy() {
    this.cleanups.forEach((fn) => fn());
    this.cleanups = [];
    this.bus.clear();
    this.video?.pause();
    this.video?.removeAttribute('src');
    this.video?.load();
    this.video = null;
  }

  on(event: Parameters<EventBus['on']>[0], handler: (payload?: unknown) => void) {
    return this.bus.on(event, handler);
  }
}

export const nativeProvider: ProviderDefinition = {
  id: 'native',
  label: 'Fichier direct (MP4 / HLS)',
  capabilities,
  embedded: false,
  resolveUrl: (video) => video.url ?? '',
  createAdapter: () => new NativeAdapter(),
  adminHint:
    "URL publique du fichier .mp4 ou du manifeste .m3u8 — par exemple un bucket Cloudflare R2. Fournisseur recommandé : lecteur entièrement contrôlé, reprise et vitesse disponibles.",
};
