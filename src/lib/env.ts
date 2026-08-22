/**
 * Accès aux variables d'environnement. Échoue au démarrage plutôt qu'à la
 * première requête si une valeur manque.
 */
function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable d'environnement manquante : ${name}. Copiez .env.example vers .env.local et renseignez-la.`,
    );
  }
  return value;
}

export const env = {
  supabaseUrl: () => required('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL),
  supabaseAnonKey: () =>
    required('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  supabaseServiceRoleKey: () =>
    required('SUPABASE_SERVICE_ROLE_KEY', process.env.SUPABASE_SERVICE_ROLE_KEY),
  siteUrl: () =>
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  isAIEnabled: () => Boolean(process.env.ANTHROPIC_API_KEY),
};
