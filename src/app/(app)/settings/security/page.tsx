import type { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChangePasswordForm } from '@/components/auth/change-password-form';
import { requireUser } from '@/server/auth/guards';

export const metadata: Metadata = { title: 'Sécurité', robots: { index: false, follow: false } };

export default async function SecuritySettingsPage() {
  await requireUser();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Changer de mot de passe</CardTitle>
        <CardDescription>
          Votre mot de passe actuel est demandé : un cookie volé ne suffit pas à s&apos;approprier
          votre compte.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
