/**
 * Supabase backs the write path only — reviews, reports and the admin queue,
 * which land in M5. The public directory reads the committed snapshot, so the
 * whole site works with none of these variables set.
 */
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export const isWritePathEnabled = () => getSupabaseConfig() !== null;
