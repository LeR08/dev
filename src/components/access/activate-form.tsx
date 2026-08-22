'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { activateCode } from '@/server/actions/access.actions';
import { activateCodeSchema, type ActivateCodeInput } from '@/validations/engagement.schema';
import { routes } from '@/lib/constants/routes';

export function ActivateForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ActivateCodeInput>({
    resolver: zodResolver(activateCodeSchema),
    defaultValues: { code: '' },
  });

  async function onSubmit(values: ActivateCodeInput) {
    setFormError(null);
    const result = await activateCode(values);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    setSuccess(result.data.message);
    router.refresh();
    setTimeout(() => router.push(routes.dashboard), 1400);
  }

  if (success) {
    return (
      <div className="space-y-5 text-center">
        <div className="bg-success-muted text-success mx-auto grid size-14 place-items-center rounded-full">
          <CheckCircle2 className="size-7" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-lg font-semibold">Accès activé</h2>
          <p className="text-muted-foreground text-sm">
            Toutes les formations couvertes par votre code sont maintenant débloquées.
          </p>
        </div>
        <Button asChild className="w-full">
          <a href={routes.dashboard}>Aller au tableau de bord</a>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <Field
        label="Code d'activation"
        htmlFor="code"
        required
        error={errors.code?.message}
        hint="Le code figure dans l'e-mail reçu après votre achat."
      >
        <Input
          placeholder="XXXX-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="text-center font-mono text-lg tracking-[0.2em] uppercase"
          {...register('code')}
          onChange={(event) => {
            // Saisie confortable : majuscules automatiques, sans surprise.
            setValue('code', event.target.value.toUpperCase(), { shouldValidate: false });
          }}
        />
      </Field>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        <KeyRound /> Activer mon accès
      </Button>
    </form>
  );
}
