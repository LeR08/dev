'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Alert } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { deleteEntity, upsertCourse } from '@/server/actions/admin.actions';
import {
  courseSchema,
  type CourseFormInput,
  type CourseInput,
} from '@/validations/admin.schema';
import { routes } from '@/lib/constants/routes';
import { slugify } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

export function CourseEditor({
  course,
  levels,
  subjects,
}: {
  course: Tables<'courses'> | null;
  levels: Array<{ id: string; name: string }>;
  subjects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [slugTouched, setSlugTouched] = React.useState(Boolean(course));

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CourseFormInput, unknown, CourseInput>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      id: course?.id,
      slug: course?.slug ?? '',
      title: course?.title ?? '',
      summary: course?.summary ?? '',
      description: course?.description ?? '',
      thumbnailUrl: course?.thumbnail_url ?? '',
      levelId: course?.level_id ?? levels[0]?.id ?? '',
      subjectId: course?.subject_id ?? subjects[0]?.id ?? '',
      difficulty: course?.difficulty ?? 'beginner',
      status: course?.status ?? 'draft',
      sortOrder: course?.sort_order ?? 0,
    },
  });

  const values = watch();

  async function onSubmit(input: CourseInput) {
    setFormError(null);
    const result = await upsertCourse(input);

    if (!result.ok) {
      setFormError(result.error);
      return;
    }

    toast({ title: 'Formation enregistrée', tone: 'success' });
    if (!course) router.replace(routes.adminCourse(result.data.id));
    else router.refresh();
  }

  async function handleDelete() {
    if (!course) return;
    const result = await deleteEntity('courses', course.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Formation supprimée', tone: 'success' });
    router.replace(routes.adminCourses);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl space-y-6" noValidate>
      {formError && <Alert variant="danger">{formError}</Alert>}

      <div className="bg-card space-y-5 rounded-xl border p-5">
        <Field label="Titre" htmlFor="title" required error={errors.title?.message}>
          <Input
            {...register('title')}
            onChange={(event) => {
              setValue('title', event.target.value, { shouldValidate: true });
              if (!slugTouched) setValue('slug', slugify(event.target.value));
            }}
          />
        </Field>

        <Field
          label="Slug"
          htmlFor="slug"
          required
          error={errors.slug?.message}
          hint={`URL publique : /courses/${values.slug || '…'}`}
        >
          <Input
            {...register('slug')}
            onChange={(event) => {
              setSlugTouched(true);
              setValue('slug', event.target.value, { shouldValidate: true });
            }}
          />
        </Field>

        <Field
          label="Résumé"
          htmlFor="summary"
          error={errors.summary?.message}
          hint="Une phrase, affichée sur les cartes du catalogue et en partage social."
        >
          <Textarea rows={2} maxLength={300} {...register('summary')} />
        </Field>

        <Field
          label="Description"
          htmlFor="description"
          error={errors.description?.message}
          hint="Markdown accepté : ## titres, **gras**, listes, liens."
        >
          <Textarea rows={8} {...register('description')} className="font-mono text-[0.8125rem]" />
        </Field>

        <Field
          label="Miniature"
          htmlFor="thumbnailUrl"
          error={errors.thumbnailUrl?.message}
          hint="URL d'une image en 16/9."
        >
          <Input {...register('thumbnailUrl')} placeholder="https://…" />
        </Field>
      </div>

      <div className="bg-card grid gap-5 rounded-xl border p-5 sm:grid-cols-2">
        <Field label="Parcours" htmlFor="levelId" required error={errors.levelId?.message}>
          <Select value={values.levelId} onValueChange={(v) => setValue('levelId', v, { shouldValidate: true })}>
            <SelectTrigger id="levelId">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {levels.map((level) => (
                <SelectItem key={level.id} value={level.id}>
                  {level.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Domaine" htmlFor="subjectId" required error={errors.subjectId?.message}>
          <Select value={values.subjectId} onValueChange={(v) => setValue('subjectId', v, { shouldValidate: true })}>
            <SelectTrigger id="subjectId">
              <SelectValue placeholder="Choisir" />
            </SelectTrigger>
            <SelectContent>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Difficulté" htmlFor="difficulty">
          <Select
            value={values.difficulty}
            onValueChange={(v) => setValue('difficulty', v as CourseInput['difficulty'])}
          >
            <SelectTrigger id="difficulty">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="beginner">Débutant</SelectItem>
              <SelectItem value="intermediate">Intermédiaire</SelectItem>
              <SelectItem value="advanced">Avancé</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field
          label="Statut"
          htmlFor="status"
          hint="Une formation en brouillon n'est visible que du staff."
        >
          <Select
            value={values.status}
            onValueChange={(v) => setValue('status', v as CourseInput['status'])}
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

      <div className="flex items-center justify-between gap-3">
        {course ? (
          <Button type="button" variant="ghost" onClick={() => setConfirmDelete(true)}>
            <Trash2 /> Supprimer
          </Button>
        ) : (
          <span />
        )}
        <Button type="submit" loading={isSubmitting}>
          {course ? 'Enregistrer' : 'Créer la formation'}
        </Button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Supprimer cette formation ?"
        description="Modules, chapitres, leçons, vidéos et quiz seront supprimés. La progression des membres sera perdue. Cette action est définitive."
        confirmLabel="Supprimer définitivement"
        destructive
        onConfirm={handleDelete}
      />
    </form>
  );
}
