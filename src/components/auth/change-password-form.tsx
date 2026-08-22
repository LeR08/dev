'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { useToast } from '@/components/ui/toast';
import { changePassword } from '@/server/actions/auth.actions';
import { changePasswordSchema, type ChangePasswordInput } from '@/validations/auth.schema';

export function ChangePasswordForm() {
  const { toast } = useToast();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
  });

  async function onSubmit(values: ChangePasswordInput) {
    setFormError(null);
    const result = await changePassword(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    reset();
    toast({ title: 'Mot de passe modifié', tone: 'success' });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <Field
        label="Mot de passe actuel"
        htmlFor="currentPassword"
        required
        error={errors.currentPassword?.message}
      >
        <Input type="password" autoComplete="current-password" {...register('currentPassword')} />
      </Field>

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
        label="Confirmer le nouveau mot de passe"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
      </Field>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Modifier le mot de passe
        </Button>
      </div>
    </form>
  );
}
