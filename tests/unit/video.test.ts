import { describe, expect, it } from 'vitest';
import { getProvider, providerOptions, resolveVideoSource, PLAYBACK_RATES } from '@/lib/video';
import { extractDriveId } from '@/lib/video/providers/google-drive';
import type { Tables } from '@/types/database.types';

function makeVideo(overrides: Partial<Tables<'videos'>>): Tables<'videos'> {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    lesson_id: '00000000-0000-0000-0000-000000000002',
    title: 'Leçon de test',
    description: null,
    provider: 'native',
    external_id: null,
    url: null,
    thumbnail_url: null,
    duration_seconds: 600,
    sort_order: 0,
    metadata: {},
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('registre des fournisseurs vidéo', () => {
  it('expose tous les fournisseurs déclarés', () => {
    expect(providerOptions.map((option) => option.value)).toEqual([
      'native',
      'youtube',
      'google_drive',
      'cloudflare_stream',
      'vimeo',
    ]);
  });

  it('retombe sur le lecteur natif pour un fournisseur inconnu', () => {
    // @ts-expect-error test volontaire d'une valeur hors énumération
    expect(getProvider('inexistant').id).toBe('native');
  });

  it('déclare honnêtement les limites de Google Drive', () => {
    const drive = getProvider('google_drive');
    expect(drive.capabilities.canSeek).toBe(false);
    expect(drive.capabilities.canTrackTime).toBe(false);
    expect(drive.capabilities.canSetRate).toBe(false);
  });

  it('accorde toutes les capacités au lecteur natif et à YouTube', () => {
    for (const id of ['native', 'youtube'] as const) {
      const provider = getProvider(id);
      expect(provider.capabilities.canSeek).toBe(true);
      expect(provider.capabilities.canTrackTime).toBe(true);
      expect(provider.capabilities.canSetRate).toBe(true);
    }
  });
});

describe('resolveVideoSource', () => {
  it('utilise l’URL directe pour le fournisseur natif', () => {
    const source = resolveVideoSource(
      makeVideo({ provider: 'native', url: 'https://cdn.exemple.com/a.mp4' }),
    );
    expect(source.playbackUrl).toBe('https://cdn.exemple.com/a.mp4');
    expect(source.embedded).toBe(false);
  });

  it('construit l’URL YouTube et déduit la miniature', () => {
    const source = resolveVideoSource(
      makeVideo({ provider: 'youtube', external_id: 'dQw4w9WgXcQ' }),
    );
    expect(source.playbackUrl).toContain('dQw4w9WgXcQ');
    expect(source.thumbnailUrl).toContain('i.ytimg.com');
    expect(source.embedded).toBe(true);
  });

  it('construit l’URL de prévisualisation Drive', () => {
    const source = resolveVideoSource(
      makeVideo({ provider: 'google_drive', external_id: 'ABC123' }),
    );
    expect(source.playbackUrl).toBe('https://drive.google.com/file/d/ABC123/preview');
  });

  it('préfère la miniature explicite à celle déduite', () => {
    const source = resolveVideoSource(
      makeVideo({
        provider: 'youtube',
        external_id: 'abc',
        thumbnail_url: 'https://exemple.com/vignette.jpg',
      }),
    );
    expect(source.thumbnailUrl).toBe('https://exemple.com/vignette.jpg');
  });
});

describe('extractDriveId', () => {
  it('extrait l’identifiant d’un lien de partage complet', () => {
    expect(extractDriveId('https://drive.google.com/file/d/1a2B3c-D4e/view?usp=sharing')).toBe(
      '1a2B3c-D4e',
    );
  });

  it('gère la forme avec paramètre id', () => {
    expect(extractDriveId('https://drive.google.com/open?id=XYZ789')).toBe('XYZ789');
  });

  it('laisse passer un identifiant déjà nu', () => {
    expect(extractDriveId('  XYZ789  ')).toBe('XYZ789');
  });
});

describe('vitesses de lecture', () => {
  it('couvre exactement les vitesses demandées', () => {
    expect([...PLAYBACK_RATES]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 2]);
  });
});
