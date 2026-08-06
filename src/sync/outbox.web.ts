import type { SyncOp } from './types';

/** Browser half of the platform split — see outbox.ts for why this exists and its native half. */
const KEY = 'tally.syncOutbox';

export async function listOutbox(): Promise<SyncOp[]> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SyncOp[]) : [];
  } catch {
    return [];
  }
}

function writeOutbox(ops: SyncOp[]): void {
  localStorage.setItem(KEY, JSON.stringify(ops));
}

export async function enqueueOp(op: SyncOp): Promise<void> {
  const current = await listOutbox();
  const withoutThisRecord = current.filter(
    (existing) => !(existing.collection === op.collection && existing.recordId === op.recordId)
  );
  writeOutbox([...withoutThisRecord, op]);
}

export async function removeOps(pushed: SyncOp[]): Promise<void> {
  if (pushed.length === 0) return;
  const current = await listOutbox();
  const pushedKeys = new Set(pushed.map((op) => `${op.collection}:${op.recordId}:${op.timestamp}`));
  writeOutbox(current.filter((op) => !pushedKeys.has(`${op.collection}:${op.recordId}:${op.timestamp}`)));
}

export async function clearOutbox(): Promise<void> {
  localStorage.removeItem(KEY);
}
