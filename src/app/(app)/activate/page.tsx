import type { Metadata } from 'next';
import { CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { ActivateForm } from '@/components/access/activate-form';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/server/auth/guards';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Activer un code',
  description: "Débloquez votre accès avec le code reçu après l'achat.",
  robots: { index: false, follow: false },
};

const SCOPE_LABELS = {
  all: 'Catalogue complet',
  subject: 'Domaine',
  course: 'Formation',
} as const;

export default async function ActivatePage() {
  await requireUser();
  const supabase = await createClient();

  const { data: enrollments } = await supabase
    .from('enrollments')
    .select(
      `id, scope, granted_at, expires_at,
       course:courses!enrollments_course_id_fkey(title),
       subject:subjects!enrollments_subject_id_fkey(name)`,
    )
    .is('revoked_at', null)
    .order('granted_at', { ascending: false });

  const active = (enrollments ?? []).filter(
    (row) => !row.expires_at || new Date(row.expires_at) > new Date(),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Activer un code d'accès"
        description="Saisissez le code reçu après votre achat pour débloquer vos formations."
      />

      <Card>
        <CardContent className="pt-6">
          <ActivateForm />
        </CardContent>
      </Card>

      {active.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">Vos accès actifs</h2>
          <ul className="space-y-2">
            {active.map((row) => (
              <li
                key={row.id}
                className="bg-card flex flex-wrap items-center gap-3 rounded-xl border p-4"
              >
                <CheckCircle2 className="text-success size-5 shrink-0" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {row.scope === 'all'
                      ? 'Catalogue complet'
                      : (row.course?.title ?? row.subject?.name ?? 'Accès')}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Activé le {formatDate(row.granted_at)}
                    {row.expires_at ? ` · expire le ${formatDate(row.expires_at)}` : ' · accès à vie'}
                  </p>
                </div>
                <Badge variant="success">{SCOPE_LABELS[row.scope]}</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
