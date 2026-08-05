import { useEffect, useState } from 'react';

/**
 * A "now" that refreshes periodically, so day boundaries and streaks roll over
 * while the app is open instead of going stale until the next navigation.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}
