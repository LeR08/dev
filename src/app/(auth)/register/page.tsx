import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = {
  title: 'Créer un compte',
  description: 'Rejoignez la formation et commencez par les leçons en accès libre.',
};

export default function RegisterPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Créer votre compte</h1>
        <p className="text-muted-foreground text-sm">
          L&apos;inscription est gratuite. Les leçons en accès libre sont immédiatement
          disponibles ; le reste se débloque avec votre code d&apos;activation.
        </p>
      </div>
      <RegisterForm />
    </div>
  );
}
