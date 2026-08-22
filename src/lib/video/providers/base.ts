import type { PlayerEvent } from '../types';

/** Gestion des abonnements, commune à tous les adaptateurs. */
export class EventBus {
  private handlers = new Map<PlayerEvent, Set<(payload?: unknown) => void>>();

  on(event: PlayerEvent, handler: (payload?: unknown) => void): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => {
      this.handlers.get(event)?.delete(handler);
    };
  }

  emit(event: PlayerEvent, payload?: unknown): void {
    this.handlers.get(event)?.forEach((handler) => handler(payload));
  }

  clear(): void {
    this.handlers.clear();
  }
}

/** Charge un script externe une seule fois, même sur appels concurrents. */
const scriptPromises = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  const existing = scriptPromises.get(src);
  if (existing) return existing;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Impossible de charger ${src}`));
    document.head.appendChild(script);
  });

  scriptPromises.set(src, promise);
  return promise;
}
