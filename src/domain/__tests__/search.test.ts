import { SEED_DRINKS, seedToDrink } from '@/db/seed';
import { periodRange } from '../dates';
import { filterEntries, normalizeSearch, searchDrinks } from '../search';
import type { Drink } from '../types';
import { at, makeEntry } from './factories';

const catalog: Drink[] = SEED_DRINKS.map((seed) => seedToDrink(seed, 0));

describe('normalizeSearch', () => {
  it('strips case and accents', () => {
    expect(normalizeSearch('Rosé')).toBe('rose');
    expect(normalizeSearch('Panaché')).toBe('panache');
  });
});

describe('searchDrinks', () => {
  it('returns everything for an empty query', () => {
    expect(searchDrinks(catalog, '')).toHaveLength(catalog.length);
  });

  it('matches accented names typed without accents', () => {
    const names = searchDrinks(catalog, 'rose').map((drink) => drink.name);
    expect(names.some((name) => name.startsWith('Rosé'))).toBe(true);
  });

  it('finds drinks through hidden aliases', () => {
    const ids = searchDrinks(catalog, 'demi').map((drink) => drink.id);
    expect(ids).toContain('beer-lager-half');
  });

  it('ranks prefix matches above substring matches', () => {
    const results = searchDrinks(catalog, 'stout');
    expect(results[0].name.toLowerCase().startsWith('stout')).toBe(true);
  });

  it('filters by category', () => {
    const wines = searchDrinks(catalog, '', 'wine');
    expect(wines.length).toBeGreaterThan(0);
    expect(wines.every((drink) => drink.category === 'wine')).toBe(true);
  });

  it('filters down to the user’s own presets', () => {
    const mine: Drink = { ...catalog[0], id: 'custom-1', name: 'My pour', isCustom: true };
    const results = searchDrinks([...catalog, mine], '', 'mine');
    expect(results).toEqual([mine]);
  });

  it('returns nothing when there is no match', () => {
    expect(searchDrinks(catalog, 'zzzzz')).toEqual([]);
  });
});

describe('filterEntries', () => {
  const entries = [
    makeEntry({ consumedAt: at(2026, 6, 1, 20), name: 'IPA', category: 'beer', location: 'Chez Marcel' }),
    makeEntry({ consumedAt: at(2026, 6, 2, 20), name: 'Red wine', category: 'wine', note: 'with friends' }),
    makeEntry({ consumedAt: at(2026, 7, 1, 20), name: 'Mojito', category: 'cocktail' }),
  ];

  it('keeps everything when no filters are set', () => {
    expect(filterEntries(entries, { range: null, category: 'all', query: '' })).toHaveLength(3);
  });

  it('filters by date range', () => {
    const june = { start: at(2026, 6, 1, 0), end: at(2026, 7, 1, 0) };
    expect(filterEntries(entries, { range: june, category: 'all', query: '' })).toHaveLength(2);
  });

  it('filters by category', () => {
    const result = filterEntries(entries, { range: null, category: 'wine', query: '' });
    expect(result.map((entry) => entry.name)).toEqual(['Red wine']);
  });

  it('searches names, notes and places', () => {
    expect(filterEntries(entries, { range: null, category: 'all', query: 'marcel' })).toHaveLength(1);
    expect(filterEntries(entries, { range: null, category: 'all', query: 'friends' })).toHaveLength(1);
    expect(filterEntries(entries, { range: null, category: 'all', query: 'mojito' })).toHaveLength(1);
  });

  it('combines filters', () => {
    const july = periodRange(at(2026, 7, 15), 'month');
    const result = filterEntries(entries, { range: july, category: 'cocktail', query: 'mo' });
    expect(result).toHaveLength(1);
  });
});
