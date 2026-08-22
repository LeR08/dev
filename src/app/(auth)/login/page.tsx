import { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/login-form';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata: Metadata = {
  title: 'Connexion',
  description: 'Accédez à votre espace de formation.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div className="space-y-7">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Content de vous revoir</h1>
        <p className="text-muted-foreground text-sm">
          Connectez-vous pour reprendre votre formation là où vous l&apos;avez laissée.
        </p>
      </div>

      <Suspense fallback={<Skeleton className="h-72 w-full rounded-xl" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
