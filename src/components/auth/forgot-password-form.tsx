'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { requestPasswordReset } from '@/server/actions/auth.actions';
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/validations/auth.schema';
import { routes } from '@/lib/constants/routes';

export function ForgotPasswordForm() {
  const [sent, setSent] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setFormError(null);
    const result = await requestPasswordReset(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSent(result.message ?? 'E-mail envoyé.');
  }

  if (sent) {
    return (
      <div className="space-y-5 text-center">
        <div className="bg-primary-muted text-primary mx-auto grid size-12 place-items-center rounded-full">
          <MailCheck className="size-6" />
        </div>
        <p className="text-muted-foreground text-sm">{sent}</p>
        <Button asChild variant="secondary" className="w-full">
          <Link href={routes.login}>Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <Field label="Adresse e-mail" htmlFor="email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="vous@exemple.com" {...register('email')} />
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Envoyer le lien de réinitialisation
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        <Link href={routes.login} className="text-primary font-medium hover:underline">
          Retour à la connexion
        </Link>
      </p>
    </form>
  );
}
