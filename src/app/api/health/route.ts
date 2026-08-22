import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Sonde de vie. Appelée deux fois par semaine par .github/workflows/keepalive.yml
 * pour empêcher la mise en pause automatique d'un projet Supabase gratuit
 * après 7 jours d'inactivité.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('levels').select('id').limit(1);

    if (error) {
      return NextResponse.json({ status: 'degraded', database: error.message }, { status: 503 });
    }

    return NextResponse.json({ status: 'ok', database: 'reachable', at: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : 'inconnue' },
      { status: 500 },
    );
  }
}
