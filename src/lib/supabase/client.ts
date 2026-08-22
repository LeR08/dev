'use client';

import { createBrowserClient } from '@supabase/ssr';
import { env } from '@/lib/env';
import type { Database } from '@/types/database.types';

let browserClient: ReturnType<typeof createBrowserClient<Database>> | undefined;

/** Client navigateur — singleton, pour ne pas multiplier les connexions realtime. */
export function createClient() {
  browserClient ??= createBrowserClient<Database>(env.supabaseUrl(), env.supabaseAnonKey());
  return browserClient;
}
