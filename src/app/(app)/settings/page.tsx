import type { Metadata } from 'next';
import { Alert } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { requireUser } from '@/server/auth/guards';
import { formatDate } from '@/lib/utils';

export const metadata: Metadata = { title: 'Compte', robots: { index: false, follow: false } };

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Informations du compte</CardTitle>
          <CardDescription>
            Pour modifier votre nom ou votre photo, rendez-vous sur votre profil.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <Row label="Adresse e-mail" value={user.email} />
          <Row
            label="Rôle"
            value={
              user.profile.role === 'admin'
                ? 'Administrateur'
                : user.profile.role === 'teacher'
                  ? 'Formateur'
                  : 'Membre'
            }
          />
          <Row label="Compte créé le" value={formatDate(user.profile.created_at)} />
          <Row label="Fuseau horaire" value={user.profile.timezone} />
        </CardContent>
      </Card>

      <Alert variant="info" title="Suppression du compte">
        La suppression d&apos;un compte est définitive et efface toute votre progression. Pour
        l&apos;instant, elle se fait sur demande auprès du support.
      </Alert>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 last:border-b-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
