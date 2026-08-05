import { at } from '@/domain/__tests__/factories';
import { DEFAULT_SETTINGS, type EntryInput } from '@/domain/types';
import { SEED_DRINKS } from '../seed';
import { WebStore } from '../web';

/**
 * Exercises the store contract against the web implementation, which runs
 * memory-only under Jest. The SQLite implementation answers the same interface;
 * these cases pin down the behaviour both are expected to share.
 */
describe('WebStore', () => {
  let store: WebStore;

  const sampleEntry = (overrides: Partial<EntryInput> = {}): EntryInput => ({
    drinkId: 'beer-lager-pint',
    name: 'Lager (pint)',
    category: 'beer',
    abv: 5,
    volumeMl: 500,
    quantity: 1,
    price: 6.5,
    consumedAt: at(2026, 5, 4, 20),
    ...overrides,
  });

  beforeEach(async () => {
    store = new WebStore();
    await store.init();
  });

  it('seeds the bundled catalog', async () => {
    const drinks = await store.listDrinks();
    expect(drinks).toHaveLength(SEED_DRINKS.length);
    expect(drinks.every((drink) => !drink.isCustom)).toBe(true);
  });

  it('does not duplicate the catalog when init runs twice', async () => {
    await store.init();
    expect(await store.listDrinks()).toHaveLength(SEED_DRINKS.length);
  });

  describe('entries', () => {
    it('creates an entry with defaults filled in', async () => {
      const entry = await store.createEntry(sampleEntry({ price: undefined }));

      expect(entry.id).toBeTruthy();
      expect(entry.price).toBeNull();
      expect(entry.note).toBeNull();
      expect(entry.createdAt).toBeGreaterThan(0);
    });

    it('lists newest first', async () => {
      await store.createEntry(sampleEntry({ name: 'older', consumedAt: at(2026, 5, 1) }));
      await store.createEntry(sampleEntry({ name: 'newer', consumedAt: at(2026, 5, 9) }));

      expect((await store.listEntries()).map((entry) => entry.name)).toEqual(['newer', 'older']);
    });

    it('narrows to a date range, excluding the end instant', async () => {
      await store.createEntry(sampleEntry({ consumedAt: at(2026, 5, 1, 12) }));
      await store.createEntry(sampleEntry({ consumedAt: at(2026, 5, 4, 12) }));

      const range = { start: at(2026, 5, 1, 0), end: at(2026, 5, 4, 0) };
      expect(await store.listEntries({ range })).toHaveLength(1);
    });

    it('applies a limit', async () => {
      await store.createEntry(sampleEntry());
      await store.createEntry(sampleEntry());
      expect(await store.listEntries({ limit: 1 })).toHaveLength(1);
    });

    it('updates only the fields provided', async () => {
      const entry = await store.createEntry(sampleEntry({ note: 'with friends' }));
      const updated = await store.updateEntry(entry.id, { quantity: 3 });

      expect(updated.quantity).toBe(3);
      expect(updated.note).toBe('with friends');
      expect(updated.price).toBe(6.5);
    });

    it('can clear a price back to null', async () => {
      const entry = await store.createEntry(sampleEntry());
      expect((await store.updateEntry(entry.id, { price: null })).price).toBeNull();
    });

    it('deletes an entry', async () => {
      const entry = await store.createEntry(sampleEntry());
      await store.deleteEntry(entry.id);

      expect(await store.getEntry(entry.id)).toBeNull();
      expect(await store.listEntries()).toHaveLength(0);
    });

    it('rejects updates to an unknown entry', async () => {
      await expect(store.updateEntry('nope', { quantity: 1 })).rejects.toThrow(/not found/);
    });
  });

  describe('custom drinks', () => {
    it('creates one and marks it as the user’s own', async () => {
      const drink = await store.createDrink({
        name: 'Homemade panaché',
        category: 'beer',
        abv: 4.3,
        defaultVolumeMl: 250,
      });

      expect(drink.isCustom).toBe(true);
      expect(drink.defaultPrice).toBeNull();
      expect((await store.listDrinks()).find((item) => item.id === drink.id)).toBeTruthy();
    });

    it('sorts custom drinks ahead of catalog ones', async () => {
      await store.createDrink({ name: 'Zzz nightcap', category: 'spirit', abv: 40, defaultVolumeMl: 40 });
      expect((await store.listDrinks())[0].name).toBe('Zzz nightcap');
    });

    it('stores a default price on a catalog drink', async () => {
      const updated = await store.updateDrink('beer-lager-pint', { defaultPrice: 7 });
      expect(updated.defaultPrice).toBe(7);
      expect(updated.isCustom).toBe(false);
    });

    it('keeps logged history when a preset is deleted', async () => {
      const drink = await store.createDrink({
        name: 'Temporary',
        category: 'beer',
        abv: 5,
        defaultVolumeMl: 330,
      });
      const entry = await store.createEntry(sampleEntry({ drinkId: drink.id, name: 'Temporary' }));

      await store.deleteDrink(drink.id);
      const kept = await store.getEntry(entry.id);

      expect(await store.getDrink(drink.id)).toBeNull();
      expect(kept?.name).toBe('Temporary');
      expect(kept?.drinkId).toBeNull();
      expect(kept?.abv).toBe(5);
    });
  });

  describe('settings', () => {
    it('starts empty and round-trips a save', async () => {
      expect(await store.getSettings()).toEqual({});

      await store.saveSettings({ ...DEFAULT_SETTINGS, currency: 'GBP', standardDrinkGrams: 8 });
      const stored = await store.getSettings();

      expect(stored.currency).toBe('GBP');
      expect(stored.standardDrinkGrams).toBe(8);
    });

    it('ignores unknown keys that may linger from another version', async () => {
      await store.saveSettings({ ...DEFAULT_SETTINGS, legacyFlag: true } as never);
      expect('legacyFlag' in (await store.getSettings())).toBe(false);
    });
  });

  describe('clearAll', () => {
    it('wipes user data and restores a working catalog', async () => {
      await store.createEntry(sampleEntry());
      await store.createDrink({ name: 'Mine', category: 'beer', abv: 5, defaultVolumeMl: 330 });
      await store.saveSettings({ ...DEFAULT_SETTINGS, currency: 'USD' });

      await store.clearAll();

      expect(await store.listEntries()).toHaveLength(0);
      expect(await store.getSettings()).toEqual({});
      const drinks = await store.listDrinks();
      expect(drinks).toHaveLength(SEED_DRINKS.length);
      expect(drinks.every((drink) => !drink.isCustom)).toBe(true);
    });
  });
});
