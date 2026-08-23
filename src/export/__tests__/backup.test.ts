import { seedToDrink, SEED_DRINKS } from '@/db/seed';
import { at, makeEntry, makeProfile, makeTicket } from '@/domain/__tests__/factories';
import { DEFAULT_SETTINGS, type Drink } from '@/domain/types';
import { backupFileName, buildBackup, ticketsFileName, ticketsToCsv, toCsv, toJson } from '../backup';

const customDrink: Drink = {
  ...seedToDrink(SEED_DRINKS[0], 0),
  id: 'custom-1',
  name: 'Homemade panaché',
  isCustom: true,
};

describe('buildBackup', () => {
  it('carries entries, settings, profile, tickets and only the user’s own drinks', () => {
    const entries = [makeEntry()];
    const profile = makeProfile();
    const tickets = [makeTicket()];
    const backup = buildBackup(
      entries,
      [seedToDrink(SEED_DRINKS[0], 0), customDrink],
      DEFAULT_SETTINGS,
      profile,
      tickets
    );

    expect(backup.app).toBe('tally');
    expect(backup.formatVersion).toBe(1);
    expect(backup.entries).toHaveLength(1);
    expect(backup.customDrinks).toEqual([customDrink]);
    expect(backup.profile).toEqual(profile);
    expect(backup.tickets).toEqual(tickets);
  });

  it('accepts a null profile — onboarding may not have run yet', () => {
    const backup = buildBackup([], [], DEFAULT_SETTINGS, null, []);
    expect(backup.profile).toBeNull();
  });

  it('serialises to valid JSON', () => {
    const backup = buildBackup([makeEntry()], [], DEFAULT_SETTINGS, null, []);
    expect(JSON.parse(toJson(backup))).toMatchObject({ app: 'tally', formatVersion: 1 });
  });
});

describe('ticketsToCsv', () => {
  it('writes a header and one row per ticket, oldest first', () => {
    const csv = ticketsToCsv([
      makeTicket({ title: 'later', createdAt: at(2026, 3, 5) }),
      makeTicket({ title: 'earlier', createdAt: at(2026, 3, 1) }),
    ]);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,type,status,title,description,app_version,platform,created_at_iso');
    expect(lines[1]).toContain('earlier');
    expect(lines[2]).toContain('later');
  });

  it('escapes free text the same way the entry export does', () => {
    const csv = ticketsToCsv([makeTicket({ description: 'crashes on "log", every time' })]);
    expect(csv).toContain('"crashes on ""log"", every time"');
  });
});

describe('ticketsFileName', () => {
  it('is dated and namespaced separately from the data export', () => {
    expect(ticketsFileName('csv', at(2026, 8, 5))).toBe('tally-tickets-2026-08-05.csv');
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

  it('neutralises a formula-looking note so a spreadsheet cannot execute it (CSV injection)', () => {
    const csv = toCsv([makeEntry({ note: '=HYPERLINK("http://evil.example","click")' })], 'EUR');
    const row = csv.split('\n')[1];
    expect(row).toContain("'=HYPERLINK");
    // The raw cell must not start with a formula trigger character.
    expect(/,=|^=/.test(row)).toBe(false);
  });

  it('also neutralises +, -, @, tab and carriage-return formula triggers', () => {
    for (const trigger of ['+1+1', '-1+1', '@SUM(1,1)', '\tcmd', '\rcmd']) {
      const csv = toCsv([makeEntry({ location: trigger })], 'EUR');
      const row = csv.split('\n')[1];
      expect(row).toContain(`'${trigger}`);
    }
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
