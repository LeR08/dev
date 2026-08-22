'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { Field } from '@/components/shared/field';
import { useToast } from '@/components/ui/toast';
import { updateProfile, updateSubjectInterests } from '@/server/actions/profile.actions';
import { profileSchema, type ProfileInput } from '@/validations/auth.schema';
import { cn } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

const NO_LEVEL = '__none__';

export function ProfileForm({
  profile,
  levels,
  subjects,
  selectedSubjectIds,
}: {
  profile: Tables<'profiles'>;
  levels: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
  selectedSubjectIds: string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [interests, setInterests] = React.useState<string[]>(selectedSubjectIds);
  const [savingInterests, setSavingInterests] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      bio: profile.bio ?? '',
      levelId: profile.level_id,
    },
  });

  const levelId = watch('levelId');

  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    const result = await updateProfile(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    toast({ title: 'Profil mis à jour', tone: 'success' });
    router.refresh();
  }

  async function saveInterests(next: string[]) {
    setInterests(next);
    setSavingInterests(true);
    const result = await updateSubjectInterests(next);
    setSavingInterests(false);
    if (!result.ok) {
      toast({ title: 'Enregistrement impossible', description: result.error, tone: 'error' });
      setInterests(selectedSubjectIds);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit(onSubmit)} className="bg-card space-y-5 rounded-xl border p-5">
        {formError && <Alert variant="danger">{formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" htmlFor="firstName" required error={errors.firstName?.message}>
            <Input {...register('firstName')} />
          </Field>
          <Field label="Nom" htmlFor="lastName" required error={errors.lastName?.message}>
            <Input {...register('lastName')} />
          </Field>
        </div>

        <Field
          label="Présentation"
          htmlFor="bio"
          error={errors.bio?.message}
          hint="Visible de vous seul pour l'instant. 500 caractères maximum."
        >
          <Textarea rows={3} maxLength={500} {...register('bio')} />
        </Field>

        <Field label="Mon parcours" htmlFor="levelId">
          <Select
            value={levelId ?? NO_LEVEL}
            onValueChange={(value) =>
              setValue('levelId', value === NO_LEVEL ? null : value, { shouldDirty: true })
            }
          >
            <SelectTrigger id="levelId">
              <SelectValue placeholder="Choisir un parcours" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_LEVEL}>Non précisé</SelectItem>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="flex justify-end">
          <Button type="submit" loading={isSubmitting} disabled={!isDirty}>
            Enregistrer
          </Button>
        </div>
      </form>

      <div className="bg-card space-y-3 rounded-xl border p-5">
        <div className="space-y-1">
          <p className="font-medium">Mes centres d&apos;intérêt</p>
          <p className="text-muted-foreground text-sm">
            Ils déterminent les formations recommandées sur votre tableau de bord.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {subjects.map((subject) => {
            const selected = interests.includes(subject.id);
            return (
              <button
                key={subject.id}
                type="button"
                disabled={savingInterests}
                onClick={() =>
                  saveInterests(
                    selected
                      ? interests.filter((id) => id !== subject.id)
                      : [...interests, subject.id],
                  )
                }
                aria-pressed={selected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:opacity-60',
                  selected
                    ? 'border-primary bg-primary-muted text-primary'
                    : 'hover:bg-muted',
                )}
              >
                {selected && <Check className="size-3.5" />}
                {subject.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
