'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { signIn } from '@/server/actions/auth.actions';
import { loginSchema, type LoginInput } from '@/validations/auth.schema';
import { routes } from '@/lib/constants/routes';

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [formError, setFormError] = React.useState<string | null>(
    searchParams.get('error') === 'account_disabled'
      ? 'Ce compte a été désactivé. Contactez le support.'
      : null,
  );
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    const result = await signIn(values);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    // Revient à la page demandée avant la redirection vers /login.
    const next = searchParams.get('next');
    router.replace(next && next.startsWith('/') ? next : result.data.next);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <Field label="Adresse e-mail" htmlFor="email" required error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="vous@exemple.com"
          {...register('email')}
        />
      </Field>

      <Field label="Mot de passe" htmlFor="password" required error={errors.password?.message}>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className="pr-10"
            {...register('password')}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 rounded p-0.5 transition-colors"
            aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </Field>

      <div className="flex justify-end">
        <Link
          href={routes.forgotPassword}
          className="text-primary text-sm font-medium hover:underline"
        >
          Mot de passe oublié ?
        </Link>
      </div>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Se connecter
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Pas encore de compte ?{' '}
        <Link href={routes.register} className="text-primary font-medium hover:underline">
          Créer un compte
        </Link>
      </p>
    </form>
  );
}
