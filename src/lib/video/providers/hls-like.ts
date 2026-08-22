import { nativeProvider } from './native';
import type { PlayerAdapter } from '../types';

/**
 * Les fournisseurs servant un fichier ou un manifeste directement lisible par
 * <video> partagent l'adaptateur natif. Un seul lecteur à maintenir.
 */
export const NativeLikeAdapterFactory = (): PlayerAdapter => nativeProvider.createAdapter();
