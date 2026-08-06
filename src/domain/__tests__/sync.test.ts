import { makeEntry, makeProfile } from './factories';
import { mergeById, mergeLatest } from '../sync';

describe('mergeById', () => {
  it('adds a remote record the local side has never seen', () => {
    const local = [makeEntry({ id: 'a' })];
    const remote = [{ ...makeEntry({ id: 'b' }) }];
    const merged = mergeById(local, remote);
    expect(merged.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('keeps the local copy when it is newer than the remote one', () => {
    const local = [makeEntry({ id: 'a', note: 'local edit', updatedAt: 200 })];
    const remote = [makeEntry({ id: 'a', note: 'stale remote', updatedAt: 100 })];
    const merged = mergeById(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe('local edit');
  });

  it('takes the remote copy when it is newer than the local one', () => {
    const local = [makeEntry({ id: 'a', note: 'stale local', updatedAt: 100 })];
    const remote = [makeEntry({ id: 'a', note: 'newer remote', updatedAt: 200 })];
    const merged = mergeById(local, remote);
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe('newer remote');
  });

  it('removes a record the remote side tombstoned, regardless of timestamps', () => {
    const local = [makeEntry({ id: 'a', updatedAt: 999 })];
    const remote = [{ ...makeEntry({ id: 'a', updatedAt: 1 }), deleted: true }];
    const merged = mergeById(local, remote);
    expect(merged).toHaveLength(0);
  });

  it('never resurrects a record that only exists as a remote tombstone', () => {
    const local: ReturnType<typeof makeEntry>[] = [];
    const remote = [{ ...makeEntry({ id: 'a' }), deleted: true }];
    const merged = mergeById(local, remote);
    expect(merged).toHaveLength(0);
  });

  it('is additive across two devices that each logged something offline', () => {
    const local = [makeEntry({ id: 'phone-entry', updatedAt: 100 })];
    const remote = [makeEntry({ id: 'web-entry', updatedAt: 150 })];
    const merged = mergeById(local, remote);
    expect(merged.map((entry) => entry.id).sort()).toEqual(['phone-entry', 'web-entry']);
  });
});

describe('mergeLatest', () => {
  it('returns the remote record when there is no local one yet (fresh sign-in on a new device)', () => {
    const remote = makeProfile({ updatedAt: 500 });
    expect(mergeLatest(null, remote)).toBe(remote);
  });

  it('returns the local record when there is no remote one yet (first sign-in migration)', () => {
    const local = makeProfile({ updatedAt: 500 });
    expect(mergeLatest(local, null)).toBe(local);
  });

  it('keeps whichever side has the newer updatedAt', () => {
    const older = makeProfile({ updatedAt: 100, weightKg: 60 });
    const newer = makeProfile({ updatedAt: 200, weightKg: 65 });
    expect(mergeLatest(older, newer)).toBe(newer);
    expect(mergeLatest(newer, older)).toBe(newer);
  });
});
