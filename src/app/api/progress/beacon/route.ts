import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

const schema = z.object({
  videoId: z.string().uuid(),
  position: z.number().int().min(0).max(24 * 3600),
  watched: z.number().int().min(0).max(24 * 3600).optional(),
});

/**
 * Point d'entrée de `navigator.sendBeacon` : la seule façon fiable
 * d'enregistrer la position quand l'utilisateur ferme l'onglet.
 * Aucune vérification supplémentaire n'est nécessaire ici : la fonction
 * upsert_video_progress contrôle elle-même la session et l'accès.
 */
export async function POST(request: NextRequest) {
  try {
    const parsed = schema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false }, { status: 401 });

    const { error } = await supabase.rpc('upsert_video_progress', {
      p_video_id: parsed.data.videoId,
      p_position: parsed.data.position,
      p_watched: parsed.data.watched ?? 0,
    });

    if (error) return NextResponse.json({ ok: false }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
