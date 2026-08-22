'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { useToast } from '@/components/ui/toast';
import { resetPassword } from '@/server/actions/auth.actions';
import { resetPasswordSchema, type ResetPasswordInput } from '@/validations/auth.schema';
import { routes } from '@/lib/constants/routes';

export function ResetPasswordForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ResetPasswordInput) {
    setFormError(null);
    const result = await resetPassword(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    toast({ title: 'Mot de passe mis à jour', tone: 'success' });
    router.replace(routes.dashboard);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <Field
        label="Nouveau mot de passe"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="8 caractères minimum, avec une majuscule, une minuscule et un chiffre."
      >
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </Field>

      <Field
        label="Confirmer le mot de passe"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Enregistrer le nouveau mot de passe
      </Button>
    </form>
  );
}
