import { describe, expect, it } from 'vitest';
import {
  formatDuration,
  formatTimecode,
  formatPercent,
  getInitials,
  getFullName,
  slugify,
  pluralize,
} from '@/lib/utils/format';

describe('formatDuration', () => {
  it('affiche les minutes seules sous une heure', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(60)).toBe('1 min');
    expect(formatDuration(540)).toBe('9 min');
  });

  it('affiche les heures avec des minutes sur deux chiffres', () => {
    expect(formatDuration(3725)).toBe('1 h 02');
    expect(formatDuration(7200)).toBe('2 h');
    expect(formatDuration(5400)).toBe('1 h 30');
  });

  it('ne produit jamais de valeur absurde', () => {
    expect(formatDuration(-10)).toBe('0 min');
    expect(formatDuration(Number.NaN)).toBe('0 min');
    expect(formatDuration(Number.POSITIVE_INFINITY)).toBe('0 min');
  });
});

describe('formatTimecode', () => {
  it('omet les heures quand elles sont nulles', () => {
    expect(formatTimecode(0)).toBe('0:00');
    expect(formatTimecode(65)).toBe('1:05');
    expect(formatTimecode(599)).toBe('9:59');
  });

  it('affiche les heures au-delà de 3600 secondes', () => {
    expect(formatTimecode(3600)).toBe('1:00:00');
    expect(formatTimecode(3725)).toBe('1:02:05');
  });

  it('ramène les valeurs négatives à zéro', () => {
    expect(formatTimecode(-5)).toBe('0:00');
  });
});

describe('formatPercent', () => {
  it('arrondit et insère une espace fine insécable avant le %', () => {
    expect(formatPercent(78.4)).toBe('78\u00a0%');
    expect(formatPercent(99.6)).toBe('100\u00a0%');
  });

  it("n'utilise jamais d'espace ordinaire", () => {
    expect(formatPercent(50)).not.toContain(' %');
  });
});

describe('getInitials', () => {
  it('compose les initiales en majuscules', () => {
    expect(getInitials('camille', 'durand')).toBe('CD');
    expect(getInitials('Camille', null)).toBe('C');
  });

  it('renvoie un caractère de repli quand rien n’est fourni', () => {
    expect(getInitials(null, null)).toBe('?');
    expect(getInitials('  ', '')).toBe('?');
  });
});

describe('getFullName', () => {
  it('ignore les parties manquantes', () => {
    expect(getFullName('Camille', 'Durand')).toBe('Camille Durand');
    expect(getFullName('Camille', null)).toBe('Camille');
    expect(getFullName(null, null)).toBe('');
  });
});

describe('slugify', () => {
  it('retire les accents et normalise', () => {
    expect(slugify('Créer sa formation en ligne')).toBe('creer-sa-formation-en-ligne');
    expect(slugify('Média Buying — Meta Ads !')).toBe('media-buying-meta-ads');
  });

  it('ne laisse jamais de tiret en bordure', () => {
    expect(slugify('  --Test--  ')).toBe('test');
  });

  it('limite la longueur', () => {
    expect(slugify('a'.repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe('pluralize', () => {
  it('accorde selon le nombre', () => {
    expect(pluralize(1, 'leçon')).toBe('leçon');
    expect(pluralize(2, 'leçon')).toBe('leçons');
    expect(pluralize(0, 'leçon')).toBe('leçon');
    expect(pluralize(3, 'terminée', 'terminées')).toBe('terminées');
  });
});
