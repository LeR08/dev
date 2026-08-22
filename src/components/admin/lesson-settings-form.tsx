'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { useToast } from '@/components/ui/toast';
import { upsertLesson } from '@/server/actions/admin.actions';
import {
  lessonSchema,
  type LessonFormInput,
  type LessonInput,
} from '@/validations/admin.schema';
import type { Tables } from '@/types/database.types';

export function LessonSettingsForm({ lesson }: { lesson: Tables<'lessons'> }) {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LessonFormInput, unknown, LessonInput>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      id: lesson.id,
      chapterId: lesson.chapter_id,
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.description ?? '',
      contentMd: lesson.content_md ?? '',
      durationSeconds: lesson.duration_seconds,
      isFreePreview: lesson.is_free_preview,
      status: lesson.status,
      sortOrder: lesson.sort_order,
    },
  });

  const values = watch();

  async function onSubmit(input: LessonInput) {
    setFormError(null);
    const result = await upsertLesson(input);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    toast({ title: 'Leçon enregistrée', tone: 'success' });
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <Field label="Titre" htmlFor="title" required error={errors.title?.message}>
          <Input {...register('title')} />
        </Field>

        <Field label="Slug" htmlFor="slug" required error={errors.slug?.message}>
          <Input {...register('slug')} />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          hint="Affichée sous le titre dans le programme."
        >
          <Textarea rows={2} {...register('description')} />
        </Field>

        <Field
          label="Contenu écrit"
          htmlFor="contentMd"
          error={errors.contentMd?.message}
          hint="Markdown : ## titres, **gras**, listes, liens, ![images](url), ```code```."
        >
          <Textarea rows={12} {...register('contentMd')} className="font-mono text-[0.8125rem]" />
        </Field>
      </div>

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <Field
          label="Durée annoncée (minutes)"
          htmlFor="durationMinutes"
          hint="Laissez 0 : la durée est calculée automatiquement à partir des vidéos."
        >
          <Input
            id="durationMinutes"
            type="number"
            min={0}
            value={Math.round((values.durationSeconds ?? 0) / 60)}
            onChange={(event) =>
              setValue('durationSeconds', Math.max(0, Number(event.target.value)) * 60)
            }
          />
        </Field>

        <div className="flex items-start justify-between gap-4">
          <div className="space-y-0.5">
            <Label htmlFor="isFreePreview">Leçon en accès libre</Label>
            <p className="text-muted-foreground text-sm">
              Visible sans code d&apos;activation. Deux ou trois leçons offertes par formation
              constituent le meilleur argument de vente.
            </p>
          </div>
          <Switch
            id="isFreePreview"
            checked={Boolean(values.isFreePreview)}
            onCheckedChange={(next) => setValue('isFreePreview', next)}
          />
        </div>

        <Field label="Statut" htmlFor="status">
          <Select
            value={values.status ?? 'published'}
            onValueChange={(value) => setValue('status', value as LessonInput['status'])}
          >
            <SelectTrigger id="status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Brouillon</SelectItem>
              <SelectItem value="published">Publiée</SelectItem>
              <SelectItem value="archived">Archivée</SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="flex justify-end">
        <Button type="submit" loading={isSubmitting}>
          Enregistrer
        </Button>
      </div>
    </form>
  );
}
