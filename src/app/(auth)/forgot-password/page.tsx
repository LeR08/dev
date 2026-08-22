import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = {
  title: 'Mot de passe oublié',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Mot de passe oublié</h1>
        <p className="text-muted-foreground text-sm">
          Indiquez votre adresse e-mail : nous vous enverrons un lien pour définir un nouveau mot de
          passe.
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
