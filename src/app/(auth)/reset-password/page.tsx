import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = {
  title: 'Nouveau mot de passe',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Nouveau mot de passe</h1>
        <p className="text-muted-foreground text-sm">
          Choisissez un mot de passe que vous n&apos;utilisez nulle part ailleurs.
        </p>
      </div>
      <ResetPasswordForm />
    </div>
  );
}
