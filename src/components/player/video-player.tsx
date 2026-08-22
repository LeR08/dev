'use client';

import * as React from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Alert } from '@/components/ui/alert';
import { getProvider, PLAYBACK_RATES, RESUME_MIN_SECONDS } from '@/lib/video';
import type { PlayerAdapter, VideoSource } from '@/lib/video';
import { useVideoProgress } from '@/hooks/use-video-progress';
import { cn, formatTimecode } from '@/lib/utils';

interface VideoPlayerProps {
  source: VideoSource;
  courseId: string;
  lessonId: string;
  initialPosition: number;
  onCompleted?: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  /** Expose seek/getTime au reste de la page (notes horodatées). */
  controlsRef?: (controls: { seek: (seconds: number) => void; getTime: () => number }) => void;
}

export function VideoPlayer({
  source,
  courseId,
  lessonId,
  initialPosition,
  onCompleted,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
  controlsRef,
}: VideoPlayerProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const adapterRef = React.useRef<PlayerAdapter | null>(null);

  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [playing, setPlaying] = React.useState(false);
  const [buffering, setBuffering] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(source.durationSeconds);
  const [volume, setVolume] = React.useState(1);
  const [muted, setMuted] = React.useState(false);
  const [rate, setRate] = React.useState(1);
  const [fullscreen, setFullscreen] = React.useState(false);
  const [controlsVisible, setControlsVisible] = React.useState(true);

  const { capabilities } = source;

  // Reprise : proposée seulement si elle a du sens, et jamais imposée.
  const [resumeOffer, setResumeOffer] = React.useState<number | null>(
    capabilities.canSeek &&
      initialPosition > RESUME_MIN_SECONDS &&
      (source.durationSeconds === 0 || initialPosition < source.durationSeconds * 0.95)
      ? initialPosition
      : null,
  );

  const getCurrentTime = React.useCallback(() => adapterRef.current?.getCurrentTime() ?? 0, []);
  const isPlaying = React.useCallback(() => !(adapterRef.current?.isPaused() ?? true), []);

  const { flush } = useVideoProgress({
    videoId: source.id,
    courseId,
    lessonId,
    enabled: capabilities.canTrackTime,
    getCurrentTime,
    isPlaying,
    onCompleted,
  });

  React.useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const adapter = getProvider(source.provider).createAdapter();
    adapterRef.current = adapter;

    const unsubscribers: Array<() => void> = [
      adapter.on('play', () => setPlaying(true)),
      adapter.on('pause', () => {
        setPlaying(false);
        void flush(true);
      }),
      adapter.on('playing', () => setBuffering(false)),
      adapter.on('waiting', () => setBuffering(true)),
      adapter.on('timeupdate', () => setCurrentTime(adapter.getCurrentTime())),
      adapter.on('durationchange', () => {
        const value = adapter.getDuration();
        if (value > 0) setDuration(value);
      }),
      adapter.on('ended', () => {
        setPlaying(false);
        void flush(true);
        onCompleted?.();
      }),
      adapter.on('error', () => setError('La vidéo n’a pas pu être chargée.')),
    ];

    adapter
      .mount(container, source, {
        // Le démarrage direct à la position évite un saut visible à l'écran.
        startAt: capabilities.canSeek ? initialPosition : 0,
        muted: false,
      })
      .then(() => {
        if (cancelled) return;
        setReady(true);
        const value = adapter.getDuration();
        if (value > 0) setDuration(value);
      })
      .catch(() => {
        if (!cancelled) setError('Ce lecteur n’a pas pu démarrer.');
      });

    return () => {
      cancelled = true;
      unsubscribers.forEach((off) => off());
      adapter.destroy();
      adapterRef.current = null;
    };
    // Remonter le lecteur uniquement quand la vidéo change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id]);

  React.useEffect(() => {
    const onFullscreenChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  // Masquage automatique des contrôles pendant la lecture.
  React.useEffect(() => {
    if (!playing) {
      setControlsVisible(true);
      return;
    }
    const timer = setTimeout(() => setControlsVisible(false), 2800);
    return () => clearTimeout(timer);
  }, [playing, currentTime]);

  const togglePlay = React.useCallback(() => {
    const adapter = adapterRef.current;
    if (!adapter) return;
    adapter.isPaused() ? adapter.play() : adapter.pause();
  }, []);

  const seekTo = React.useCallback(
    (seconds: number) => {
      if (!capabilities.canSeek) return;
      const target = Math.min(Math.max(0, seconds), duration || Number.MAX_SAFE_INTEGER);
      adapterRef.current?.seek(target);
      setCurrentTime(target);
    },
    [capabilities.canSeek, duration],
  );

  const skip = React.useCallback(
    (delta: number) => seekTo(getCurrentTime() + delta),
    [getCurrentTime, seekTo],
  );

  React.useEffect(() => {
    controlsRef?.({ seek: seekTo, getTime: getCurrentTime });
  }, [controlsRef, seekTo, getCurrentTime]);

  async function toggleFullscreen() {
    const element = wrapperRef.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await element.requestFullscreen().catch(() => undefined);
  }

  // Raccourcis clavier, uniquement quand le lecteur a le focus.
  function onKeyDown(event: React.KeyboardEvent) {
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA'].includes(target.tagName)) return;

    switch (event.key) {
      case ' ':
      case 'k':
        event.preventDefault();
        togglePlay();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        skip(-10);
        break;
      case 'ArrowRight':
        event.preventDefault();
        skip(10);
        break;
      case 'm':
        event.preventDefault();
        handleMute(!muted);
        break;
      case 'f':
        event.preventDefault();
        void toggleFullscreen();
        break;
    }
  }

  function handleVolume(value: number) {
    setVolume(value);
    setMuted(value === 0);
    adapterRef.current?.setVolume(value);
    adapterRef.current?.setMuted(value === 0);
  }

  function handleMute(next: boolean) {
    setMuted(next);
    adapterRef.current?.setMuted(next);
  }

  function handleRate(next: number) {
    setRate(next);
    adapterRef.current?.setPlaybackRate(next);
  }

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-3">
      <div
        ref={wrapperRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onMouseMove={() => setControlsVisible(true)}
        onDoubleClick={() => void toggleFullscreen()}
        className="group focus-visible:ring-primary/50 relative aspect-video w-full overflow-hidden rounded-xl bg-black focus-visible:ring-2 focus-visible:outline-none"
        role="region"
        aria-label={`Lecteur vidéo : ${source.title}`}
      >
        <div ref={containerRef} className="absolute inset-0" />

        {!ready && !error && (
          <div className="absolute inset-0 grid place-items-center bg-black">
            <Loader2 className="size-7 animate-spin text-white/70" aria-label="Chargement" />
          </div>
        )}

        {buffering && ready && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <Loader2 className="size-8 animate-spin text-white/80" aria-hidden />
          </div>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center bg-black p-6 text-center">
            <div className="space-y-2">
              <p className="text-sm font-medium text-white">{error}</p>
              <p className="text-xs text-white/60">
                Vérifiez votre connexion, puis rechargez la page.
              </p>
            </div>
          </div>
        )}

        {/* Proposition de reprise — jamais un saut silencieux. */}
        {resumeOffer !== null && ready && !error && (
          <div className="animate-slide-up absolute inset-x-3 bottom-20 z-10 flex flex-wrap items-center gap-3 rounded-xl bg-black/85 p-3 backdrop-blur-sm sm:inset-x-auto sm:left-4">
            <p className="text-sm text-white">
              Reprendre à <strong className="tabular-nums">{formatTimecode(resumeOffer)}</strong> ?
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  seekTo(resumeOffer);
                  setResumeOffer(null);
                  adapterRef.current?.play();
                }}
              >
                Reprendre
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-white hover:bg-white/15 hover:text-white"
                onClick={() => {
                  seekTo(0);
                  setResumeOffer(null);
                }}
              >
                Recommencer
              </Button>
            </div>
          </div>
        )}

        {/* Zone cliquable centrale : lecture/pause au clic sur la vidéo. */}
        {!source.embedded && ready && !error && (
          <button
            type="button"
            onClick={togglePlay}
            className="absolute inset-0 z-0"
            aria-label={playing ? 'Mettre en pause' : 'Lire'}
          >
            {!playing && (
              <span className="grid size-full place-items-center bg-black/25">
                <span className="grid size-16 place-items-center rounded-full bg-white/90 text-black">
                  <Play className="ml-0.5 size-7 fill-current" aria-hidden />
                </span>
              </span>
            )}
          </button>
        )}

        {/* Barre de contrôle — masquée pour les fournisseurs sans API. */}
        {capabilities.canTrackTime && ready && !error && (
          <div
            className={cn(
              'absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent px-3 pt-10 pb-3 transition-opacity duration-300',
              controlsVisible || !playing ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Timeline
              value={progressPercent}
              duration={duration}
              currentTime={currentTime}
              canSeek={capabilities.canSeek}
              onSeek={seekTo}
            />

            <div className="mt-2 flex items-center gap-1 text-white">
              <IconButton
                onClick={togglePlay}
                label={playing ? 'Pause' : 'Lecture'}
                icon={playing ? Pause : Play}
              />
              {capabilities.canSeek && (
                <>
                  <IconButton onClick={() => skip(-10)} label="Reculer de 10 secondes" icon={RotateCcw} />
                  <IconButton onClick={() => skip(10)} label="Avancer de 10 secondes" icon={RotateCw} />
                </>
              )}

              <span className="ml-1 text-xs tabular-nums text-white/85">
                {formatTimecode(currentTime)} / {formatTimecode(duration)}
              </span>

              <div className="flex-1" />

              {capabilities.canSetVolume && (
                <div className="group/volume flex items-center gap-1">
                  <IconButton
                    onClick={() => handleMute(!muted)}
                    label={muted ? 'Réactiver le son' : 'Couper le son'}
                    icon={muted || volume === 0 ? VolumeX : Volume2}
                  />
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(event) => handleVolume(Number(event.target.value))}
                    aria-label="Volume"
                    className="accent-primary hidden h-1 w-20 cursor-pointer sm:block"
                  />
                </div>
              )}

              {capabilities.canSetRate && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex h-8 items-center gap-1 rounded-md px-2 text-xs font-medium transition-colors hover:bg-white/15"
                      aria-label="Vitesse de lecture"
                    >
                      <Gauge className="size-4" aria-hidden />
                      {rate}×
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {PLAYBACK_RATES.map((value) => (
                      <DropdownMenuItem key={value} onSelect={() => handleRate(value)}>
                        {value === rate && <Check className="size-3.5" />}
                        <span className={cn(value !== rate && 'ml-6')}>{value}×</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <IconButton
                onClick={() => void toggleFullscreen()}
                label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'}
                icon={fullscreen ? Minimize : Maximize}
              />
            </div>
          </div>
        )}
      </div>

      {/* Le fournisseur ne permet pas le suivi : on le dit, on ne le cache pas. */}
      {!capabilities.canTrackTime && (
        <Alert variant="info" title="Lecteur externe">
          Ce fournisseur vidéo ne permet ni la reprise automatique ni le suivi de progression.
          Utilisez le bouton « Marquer comme terminé » une fois la leçon vue.
        </Alert>
      )}

      {(hasPrevious || hasNext) && (
        <div className="flex items-center justify-between gap-2">
          <Button variant="secondary" size="sm" onClick={onPrevious} disabled={!hasPrevious}>
            <ChevronLeft /> Leçon précédente
          </Button>
          <Button variant="secondary" size="sm" onClick={onNext} disabled={!hasNext}>
            Leçon suivante <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

function IconButton({
  onClick,
  label,
  icon: Icon,
}: {
  onClick: () => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-8 place-items-center rounded-md transition-colors hover:bg-white/15"
    >
      <Icon className="size-4" />
    </button>
  );
}

/** Barre de progression cliquable, avec aperçu du temps au survol. */
function Timeline({
  value,
  duration,
  currentTime,
  canSeek,
  onSeek,
}: {
  value: number;
  duration: number;
  currentTime: number;
  canSeek: boolean;
  onSeek: (seconds: number) => void;
}) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [hoverPercent, setHoverPercent] = React.useState<number | null>(null);

  function positionFromEvent(clientX: number) {
    const rect = barRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return 0;
    return Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  }

  return (
    <div className="relative">
      {hoverPercent !== null && duration > 0 && (
        <span
          className="pointer-events-none absolute -top-7 -translate-x-1/2 rounded bg-black/90 px-1.5 py-0.5 text-[0.6875rem] tabular-nums text-white"
          style={{ left: `${hoverPercent * 100}%` }}
        >
          {formatTimecode(hoverPercent * duration)}
        </span>
      )}
      <div
        ref={barRef}
        role="slider"
        tabIndex={canSeek ? 0 : -1}
        aria-label="Progression de la vidéo"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(currentTime)}
        aria-valuetext={formatTimecode(currentTime)}
        onClick={(event) => canSeek && onSeek(positionFromEvent(event.clientX) * duration)}
        onMouseMove={(event) => setHoverPercent(positionFromEvent(event.clientX))}
        onMouseLeave={() => setHoverPercent(null)}
        onKeyDown={(event) => {
          if (!canSeek) return;
          if (event.key === 'ArrowLeft') onSeek(currentTime - 5);
          if (event.key === 'ArrowRight') onSeek(currentTime + 5);
        }}
        className={cn(
          'group/timeline relative h-4 -my-1.5 flex items-center',
          canSeek ? 'cursor-pointer' : 'cursor-default',
        )}
      >
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/25 transition-[height] group-hover/timeline:h-1.5">
          <div
            className="bg-primary h-full rounded-full transition-[width] duration-150"
            style={{ width: `${Math.min(100, value)}%` }}
          />
        </div>
        {canSeek && (
          <span
            className="bg-primary absolute size-3 -translate-x-1/2 rounded-full opacity-0 transition-opacity group-hover/timeline:opacity-100"
            style={{ left: `${Math.min(100, value)}%` }}
            aria-hidden
          />
        )}
      </div>
    </div>
  );
}
