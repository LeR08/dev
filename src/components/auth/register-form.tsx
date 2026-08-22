'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Field, fieldAria } from '@/components/shared/field';
import { signUp } from '@/server/actions/auth.actions';
import { registerSchema, type RegisterInput } from '@/validations/auth.schema';
import { routes } from '@/lib/constants/routes';

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false as unknown as true,
    },
  });

  const acceptTerms = watch('acceptTerms');

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    const result = await signUp(values);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    if (result.data.needsConfirmation) {
      setConfirmationSent(true);
      return;
    }

    router.replace(routes.onboarding);
    router.refresh();
  }

  if (confirmationSent) {
    return (
      <div className="space-y-5 text-center">
        <div className="bg-success-muted text-success mx-auto grid size-12 place-items-center rounded-full">
          <CheckCircle2 className="size-6" />
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Vérifiez votre boîte de réception</h2>
          <p className="text-muted-foreground text-sm">
            Nous vous avons envoyé un lien de confirmation. Cliquez dessus pour activer votre
            compte, puis revenez ici pour vous connecter.
          </p>
        </div>
        <Button asChild variant="secondary" className="w-full">
          <Link href={routes.login}>Retour à la connexion</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom" htmlFor="firstName" required error={errors.firstName?.message}>
          <Input autoComplete="given-name" placeholder="Camille" {...register('firstName')} />
        </Field>
        <Field label="Nom" htmlFor="lastName" required error={errors.lastName?.message}>
          <Input autoComplete="family-name" placeholder="Durand" {...register('lastName')} />
        </Field>
      </div>

      <Field label="Adresse e-mail" htmlFor="email" required error={errors.email?.message}>
        <Input type="email" autoComplete="email" placeholder="vous@exemple.com" {...register('email')} />
      </Field>

      <Field
        label="Mot de passe"
        htmlFor="password"
        required
        error={errors.password?.message}
        hint="8 caractères minimum, avec une majuscule, une minuscule et un chiffre."
      >
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            className="pr-10"
            {...fieldAria('password', { error: errors.password?.message, hint: true })}
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

      <Field
        label="Confirmer le mot de passe"
        htmlFor="confirmPassword"
        required
        error={errors.confirmPassword?.message}
      >
        <Input type="password" autoComplete="new-password" {...register('confirmPassword')} />
      </Field>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2.5">
          <Checkbox
            id="acceptTerms"
            checked={Boolean(acceptTerms)}
            onCheckedChange={(checked) =>
              setValue('acceptTerms', (checked === true) as true, { shouldValidate: true })
            }
          />
          <label htmlFor="acceptTerms" className="text-muted-foreground text-sm leading-snug">
            J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.
          </label>
        </div>
        {errors.acceptTerms && (
          <p className="text-danger text-xs" role="alert">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" className="w-full" size="lg" loading={isSubmitting}>
        Créer mon compte
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Déjà inscrit ?{' '}
        <Link href={routes.login} className="text-primary font-medium hover:underline">
          Se connecter
        </Link>
      </p>
    </form>
  );
}
