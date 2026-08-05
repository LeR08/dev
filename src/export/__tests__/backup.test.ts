import { seedToDrink, SEED_DRINKS } from '@/db/seed';
import { at, makeEntry } from '@/domain/__tests__/factories';
import { DEFAULT_SETTINGS, type Drink } from '@/domain/types';
import { backupFileName, buildBackup, toCsv, toJson } from '../backup';

const customDrink: Drink = {
  ...seedToDrink(SEED_DRINKS[0], 0),
  id: 'custom-1',
  name: 'Homemade panaché',
  isCustom: true,
};

describe('buildBackup', () => {
  it('carries entries, settings and only the user’s own drinks', () => {
    const entries = [makeEntry()];
    const backup = buildBackup(entries, [seedToDrink(SEED_DRINKS[0], 0), customDrink], DEFAULT_SETTINGS);

    expect(backup.app).toBe('tally');
    expect(backup.formatVersion).toBe(1);
    expect(backup.entries).toHaveLength(1);
    expect(backup.customDrinks).toEqual([customDrink]);
  });

  it('serialises to valid JSON', () => {
    const backup = buildBackup([makeEntry()], [], DEFAULT_SETTINGS);
    expect(JSON.parse(toJson(backup))).toMatchObject({ app: 'tally', formatVersion: 1 });
  });
});

describe('toCsv', () => {
  it('writes a header and one row per entry', () => {
    const csv = toCsv([makeEntry({ consumedAt: at(2026, 3, 4, 21, 30) })], 'EUR');
    const lines = csv.split('\n');

    expect(lines).toHaveLength(2);
    expect(lines[0].startsWith('id,consumed_at_iso,date,time,name')).toBe(true);
    expect(lines[1]).toContain('2026-03-04');
    expect(lines[1]).toContain('21:30');
  });

  it('includes derived totals so a spreadsheet needs no formulas', () => {
    const csv = toCsv([makeEntry({ volumeMl: 500, abv: 5, quantity: 2 })], 'EUR');
    const row = csv.split('\n')[1].split(',');

    expect(row).toContain('1000'); // total volume
    expect(row.some((cell) => cell.startsWith('39.4'))).toBe(true); // grams of alcohol
  });

  it('escapes quotes, commas and newlines in free text', () => {
    const csv = toCsv([makeEntry({ note: 'said "hi", then left\nlate' })], 'EUR');
    expect(csv).toContain('"said ""hi"", then left\nlate"');
  });

  it('leaves price and currency blank when no price was recorded', () => {
    const csv = toCsv([makeEntry({ price: null })], 'EUR');
    expect(csv.split('\n')[1]).toContain(',,');
    expect(csv).not.toContain('EUR');
  });

  it('sorts rows oldest first', () => {
    const csv = toCsv(
      [
        makeEntry({ name: 'later', consumedAt: at(2026, 3, 5) }),
        makeEntry({ name: 'earlier', consumedAt: at(2026, 3, 1) }),
      ],
      'EUR'
    );
    const lines = csv.split('\n');
    expect(lines[1]).toContain('earlier');
    expect(lines[2]).toContain('later');
  });
});

describe('backupFileName', () => {
  it('is dated and carries the right extension', () => {
    expect(backupFileName('csv', at(2026, 8, 5))).toBe('tally-export-2026-08-05.csv');
    expect(backupFileName('json', at(2026, 8, 5))).toBe('tally-export-2026-08-05.json');
  });
});
