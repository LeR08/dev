import { NextResponse } from 'next/server';
import { z } from 'zod';
import { isWritePathEnabled } from '@/lib/supabase';

const Report = z.object({
  target_type: z.enum(['venue', 'review']),
  target_id: z.string().min(1).max(200),
  kind: z.enum(['wrong_hours', 'closed', 'wrong_address', 'spam', 'abuse', 'other']),
  message: z.string().max(1000).optional(),
});

/**
 * §F8: corrections need no account. Persisting them needs Supabase, which lands
 * in M5 — until it is configured this answers 503 rather than accepting a
 * report it would silently drop.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 });
  }

  const parsed = Report.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid report', issues: parsed.error.issues }, { status: 400 });
  }

  if (!isWritePathEnabled()) {
    return NextResponse.json(
      { error: 'reports are not being collected yet', stored: false },
      { status: 503 },
    );
  }

  // M5: Turnstile verification, hashed rate-limit key, insert into `reports`.
  return NextResponse.json({ error: 'not implemented', stored: false }, { status: 501 });
}
