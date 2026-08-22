import type { MountOptions, PlayerAdapter, PlayerCapabilities, ProviderDefinition, VideoSource } from '../types';
import { EventBus, loadScript } from './base';

/**
 * YouTube en vidéo « non répertoriée ».
 *
 * L'IFrame Player API expose seek, vitesse, volume et position : toutes les
 * fonctions du lecteur restent disponibles. Hébergement illimité et gratuit.
 * Contrepartie : la vidéo est chez Google et l'habillage YouTube reste visible
 * au survol.
 */
const capabilities: PlayerCapabilities = {
  canSeek: true,
  canTrackTime: true,
  canSetRate: true,
  canSetVolume: true,
  hasNativeFullscreen: false,
};

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  getPlayerState(): number;
  destroy(): void;
}

interface YTNamespace {
  Player: new (element: HTMLElement, config: Record<string, unknown>) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

async function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return window.YT;

  const ready = new Promise<void>((resolve) => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previous?.();
      resolve();
    };
  });

  await loadScript('https://www.youtube.com/iframe_api');
  await ready;

  if (!window.YT?.Player) throw new Error("API YouTube indisponible");
  return window.YT;
}

class YouTubeAdapter implements PlayerAdapter {
  readonly capabilities = capabilities;
  private bus = new EventBus();
  private player: YTPlayer | null = null;
  private ticker: ReturnType<typeof setInterval> | null = null;
  private paused = true;

  async mount(container: HTMLElement, source: VideoSource, options: MountOptions): Promise<void> {
    const YT = await loadYouTubeApi();

    const host = document.createElement('div');
    host.className = 'h-full w-full';
    container.replaceChildren(host);

    await new Promise<void>((resolve) => {
      this.player = new YT.Player(host, {
        videoId: source.externalId ?? '',
        playerVars: {
          autoplay: options.autoplay ? 1 : 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          playsinline: 1,
          start: options.startAt ? Math.floor(options.startAt) : 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            if (options.muted) this.player?.mute();
            this.bus.emit('ready');
            this.bus.emit('durationchange');
            resolve();
          },
          onStateChange: (event: { data: number }) => {
            if (event.data === YT.PlayerState.PLAYING) {
              this.paused = false;
              this.bus.emit('play');
              this.bus.emit('playing');
            } else if (event.data === YT.PlayerState.PAUSED) {
              this.paused = true;
              this.bus.emit('pause');
            } else if (event.data === YT.PlayerState.ENDED) {
              this.paused = true;
              this.bus.emit('ended');
            } else if (event.data === YT.PlayerState.BUFFERING) {
              this.bus.emit('waiting');
            }
          },
          onError: () => this.bus.emit('error'),
        },
      });
    });

    // L'API YouTube n'émet pas d'événement de progression : on l'échantillonne.
    this.ticker = setInterval(() => {
      if (!this.paused) this.bus.emit('timeupdate');
    }, 500);
  }

  play() { this.player?.playVideo(); }
  pause() { this.player?.pauseVideo(); }
  seek(seconds: number) { this.player?.seekTo(Math.max(0, seconds), true); }
  getCurrentTime() { return this.player?.getCurrentTime() ?? 0; }
  getDuration() { return this.player?.getDuration() ?? 0; }
  setPlaybackRate(rate: number) { this.player?.setPlaybackRate(rate); }
  setVolume(volume: number) { this.player?.setVolume(Math.round(volume * 100)); }
  setMuted(muted: boolean) {
    if (muted) this.player?.mute();
    else this.player?.unMute();
  }
  isPaused() { return this.paused; }

  destroy() {
    if (this.ticker) clearInterval(this.ticker);
    this.ticker = null;
    this.bus.clear();
    try {
      this.player?.destroy();
    } catch {
      // L'iframe peut déjà être détachée du DOM.
    }
    this.player = null;
  }

  on(event: Parameters<EventBus['on']>[0], handler: (payload?: unknown) => void) {
    return this.bus.on(event, handler);
  }
}

export const youtubeProvider: ProviderDefinition = {
  id: 'youtube',
  label: 'YouTube (non répertorié)',
  capabilities,
  embedded: true,
  resolveUrl: (video) => `https://www.youtube.com/watch?v=${video.external_id ?? ''}`,
  defaultThumbnail: (video) =>
    video.external_id ? `https://i.ytimg.com/vi/${video.external_id}/maxresdefault.jpg` : null,
  createAdapter: () => new YouTubeAdapter(),
  adminHint:
    "Identifiant de la vidéo (les 11 caractères après « v= »). Réglez la visibilité sur « Non répertoriée » : la vidéo reste inaccessible sans le lien.",
};
