import { LANGUAGES } from '@/domain/types';
import { CATALOGS, isLanguageComplete } from '../index';
import { translate, type Catalog } from '../translate';

/** Every dot-path present in a catalog, e.g. ["common.save", "common.cancel", ...]. */
function keyPaths(catalog: Catalog, prefix = ''): string[] {
  return Object.entries(catalog).flatMap(([key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === 'string' ? [path] : keyPaths(value, path);
  });
}

describe('translation catalogs', () => {
  it('ship a catalog for every declared language', () => {
    for (const language of LANGUAGES) {
      expect(CATALOGS[language]).toBeDefined();
    }
  });

  it('every language has exactly the same key set as English', () => {
    const englishKeys = keyPaths(CATALOGS.en).sort();
    for (const language of LANGUAGES) {
      expect(keyPaths(CATALOGS[language]).sort()).toEqual(englishKeys);
    }
  });

  it('no catalog has an empty string for a key that exists', () => {
    for (const language of LANGUAGES) {
      for (const path of keyPaths(CATALOGS[language])) {
        expect(translate(CATALOGS[language], CATALOGS.en, path).length).toBeGreaterThan(0);
      }
    }
  });

  it('marks French complete and the rest as scaffolded', () => {
    expect(isLanguageComplete('en')).toBe(true);
    expect(isLanguageComplete('fr')).toBe(true);
    expect(isLanguageComplete('es')).toBe(false);
    expect(isLanguageComplete('de')).toBe(false);
    expect(isLanguageComplete('it')).toBe(false);
    expect(isLanguageComplete('pt')).toBe(false);
  });

  it('French text actually differs from English for a representative sample', () => {
    // Guards against fr.json silently regressing into an English copy like the
    // scaffolded languages.
    const sample = ['common.save', 'onboarding.profile.title', 'help.disclaimer'];
    for (const key of sample) {
      expect(translate(CATALOGS.fr, CATALOGS.en, key)).not.toBe(translate(CATALOGS.en, CATALOGS.en, key));
    }
  });
});

describe('translate', () => {
  const catalog: Catalog = { greeting: 'Hi {{name}}', nested: { label: 'Nested' } };
  const fallback: Catalog = { greeting: 'Hello {{name}}', nested: { label: 'Fallback nested' }, onlyInFallback: 'Fallback only' };

  it('resolves a nested dot path', () => {
    expect(translate(catalog, fallback, 'nested.label')).toBe('Nested');
  });

  it('interpolates variables', () => {
    expect(translate(catalog, fallback, 'greeting', { name: 'Alex' })).toBe('Hi Alex');
  });

  it('leaves an unmatched placeholder untouched rather than erroring', () => {
    expect(translate(catalog, fallback, 'greeting', {})).toBe('Hi {{name}}');
  });

  it('falls back to the fallback catalog when a key is missing', () => {
    expect(translate(catalog, fallback, 'onlyInFallback')).toBe('Fallback only');
  });

  it('falls back to the raw key when missing everywhere', () => {
    expect(translate(catalog, fallback, 'nothing.here')).toBe('nothing.here');
  });
});
