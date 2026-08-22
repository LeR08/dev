'use client';

import * as React from 'react';
import { saveVideoProgress, recordStudyTime } from '@/server/actions/progress.actions';
import { PROGRESS_SAVE_INTERVAL_MS } from '@/lib/video';

interface Options {
  videoId: string;
  courseId: string;
  lessonId: string;
  /** false pour les fournisseurs sans suivi du temps (Google Drive). */
  enabled: boolean;
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  onCompleted?: () => void;
}

/**
 * Sauvegarde périodique de la position de lecture et du temps d'étude.
 *
 * Trois déclencheurs : intervalle régulier pendant la lecture, mise en pause
 * ou passage en arrière-plan, et déchargement de la page. Le dernier utilise
 * `sendBeacon` via une requête `keepalive` : une server action classique
 * serait annulée par la navigation.
 */
export function useVideoProgress({
  videoId,
  courseId,
  lessonId,
  enabled,
  getCurrentTime,
  isPlaying,
  onCompleted,
}: Options) {
  const lastSaved = React.useRef(0);
  const watchedSeconds = React.useRef(0);
  const studyBuffer = React.useRef(0);
  const completedRef = React.useRef(false);

  const flush = React.useCallback(
    async (force = false) => {
      if (!enabled) return;
      const position = Math.floor(getCurrentTime());
      if (!force && Math.abs(position - lastSaved.current) < 3) return;

      lastSaved.current = position;
      const watched = Math.floor(watchedSeconds.current);

      const result = await saveVideoProgress({ videoId, position, watched });
      if (result.ok && result.data.completed && !completedRef.current) {
        completedRef.current = true;
        onCompleted?.();
      }

      if (studyBuffer.current >= 30) {
        const seconds = Math.min(1800, Math.floor(studyBuffer.current));
        studyBuffer.current = 0;
        await recordStudyTime({ seconds, courseId, lessonId });
      }
    },
    [enabled, getCurrentTime, videoId, courseId, lessonId, onCompleted],
  );

  React.useEffect(() => {
    if (!enabled) return;

    const ticker = setInterval(() => {
      if (isPlaying()) {
        watchedSeconds.current += PROGRESS_SAVE_INTERVAL_MS / 1000;
        studyBuffer.current += PROGRESS_SAVE_INTERVAL_MS / 1000;
        void flush();
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') void flush(true);
    };

    const onBeforeUnload = () => {
      // Requête synchrone tolérée au déchargement : keepalive garantit l'envoi.
      const position = Math.floor(getCurrentTime());
      if (position <= 0) return;
      navigator.sendBeacon?.(
        '/api/progress/beacon',
        new Blob([JSON.stringify({ videoId, position, watched: Math.floor(watchedSeconds.current) })], {
          type: 'application/json',
        }),
      );
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('beforeunload', onBeforeUnload);
    window.addEventListener('pagehide', onBeforeUnload);

    return () => {
      clearInterval(ticker);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('beforeunload', onBeforeUnload);
      window.removeEventListener('pagehide', onBeforeUnload);
      void flush(true);
    };
  }, [enabled, flush, getCurrentTime, isPlaying, videoId]);

  return { flush };
}
