'use client';

import * as React from 'react';
import { Check, FileQuestion, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Textarea } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Field } from '@/components/shared/field';
import { EmptyState } from '@/components/shared/states';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { SortableList } from './sortable-list';
import { useToast } from '@/components/ui/toast';
import {
  deleteEntity,
  reorderEntities,
  upsertQuestion,
  upsertQuiz,
} from '@/server/actions/admin.actions';
import { cn, pluralize } from '@/lib/utils';
import type { Enums, Tables } from '@/types/database.types';

type AnswerRow = Pick<
  Tables<'answers'>,
  'id' | 'question_id' | 'label' | 'is_correct' | 'match_pattern' | 'sort_order'
>;

const QUESTION_TYPES: Array<{ value: Enums<'question_type'>; label: string; hint: string }> = [
  { value: 'single_choice', label: 'Choix unique', hint: 'Une seule bonne réponse.' },
  { value: 'multiple_choice', label: 'Choix multiples', hint: 'Plusieurs bonnes réponses ; l’ensemble doit être exact.' },
  { value: 'true_false', label: 'Vrai / Faux', hint: 'Deux options, une seule correcte.' },
  { value: 'short_answer', label: 'Réponse courte', hint: 'Comparaison insensible à la casse et aux accents.' },
];

export function QuizManager({
  lessonId,
  quizzes,
  questions,
  answers,
  onChanged,
}: {
  lessonId: string;
  quizzes: Tables<'quizzes'>[];
  questions: Tables<'questions'>[];
  answers: AnswerRow[];
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [quizDialog, setQuizDialog] = React.useState<Tables<'quizzes'> | null | 'new'>(null);
  const [questionDialog, setQuestionDialog] = React.useState<
    { quizId: string; question: Tables<'questions'> | null } | null
  >(null);
  const [toDelete, setToDelete] = React.useState<
    { entity: 'quizzes' | 'questions'; id: string; label: string } | null
  >(null);

  const questionsByQuiz = new Map<string, Tables<'questions'>[]>();
  for (const question of questions) {
    const list = questionsByQuiz.get(question.quiz_id) ?? [];
    list.push(question);
    questionsByQuiz.set(question.quiz_id, list);
  }

  const answersByQuestion = new Map<string, AnswerRow[]>();
  for (const answer of answers) {
    const list = answersByQuestion.get(answer.question_id) ?? [];
    list.push(answer);
    answersByQuestion.set(answer.question_id, list);
  }

  async function handleDelete() {
    if (!toDelete) return;
    const result = await deleteEntity(toDelete.entity, toDelete.id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Supprimé', tone: 'success' });
    onChanged();
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setQuizDialog('new')}>
          <Plus /> Ajouter un quiz
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <EmptyState
          icon={FileQuestion}
          title="Aucun quiz"
          description="Un quiz court après chaque leçon ancre bien mieux les notions qu'un long examen final."
          action={{ label: 'Créer un quiz', onClick: () => setQuizDialog('new') }}
        />
      ) : (
        <div className="space-y-4">
          {quizzes.map((quiz) => {
            const quizQuestions = questionsByQuiz.get(quiz.id) ?? [];
            return (
              <div key={quiz.id} className="bg-card overflow-hidden rounded-xl border">
                <div className="flex flex-wrap items-center gap-3 border-b px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{quiz.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {quizQuestions.length} {pluralize(quizQuestions.length, 'question')} · réussite
                      à {quiz.passing_score} %
                      {quiz.max_attempts ? ` · ${quiz.max_attempts} tentative(s)` : ' · tentatives illimitées'}
                      {quiz.time_limit_seconds ? ` · ${Math.round(quiz.time_limit_seconds / 60)} min` : ''}
                    </p>
                  </div>
                  {quiz.status !== 'published' && <Badge variant="warning">Brouillon</Badge>}
                  <Button size="icon-sm" variant="ghost" aria-label="Modifier le quiz" onClick={() => setQuizDialog(quiz)}>
                    <Pencil />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Supprimer le quiz"
                    onClick={() => setToDelete({ entity: 'quizzes', id: quiz.id, label: quiz.title })}
                  >
                    <Trash2 />
                  </Button>
                </div>

                <div className="space-y-2 p-4">
                  <SortableList
                    items={quizQuestions}
                    className="space-y-2"
                    onReorder={async (orderedIds) => {
                      const result = await reorderEntities({
                        entity: 'questions',
                        parentId: quiz.id,
                        orderedIds,
                      });
                      if (!result.ok) {
                        toast({ title: 'Réordonnancement impossible', tone: 'error' });
                        return;
                      }
                      onChanged();
                    }}
                    renderItem={(question, index) => {
                      const questionAnswers = answersByQuestion.get(question.id) ?? [];
                      return (
                        <div className="rounded-lg border p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-muted-foreground shrink-0 text-xs font-semibold tabular-nums">
                              {index + 1}.
                            </span>
                            <div className="min-w-0 flex-1 space-y-2">
                              <p className="text-sm">{question.prompt}</p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <Badge variant="outline">
                                  {QUESTION_TYPES.find((t) => t.value === question.type)?.label}
                                </Badge>
                                <Badge variant="default">{question.points} pt</Badge>
                              </div>
                              <ul className="space-y-0.5">
                                {questionAnswers.map((answer) => (
                                  <li
                                    key={answer.id}
                                    className={cn(
                                      'flex items-center gap-1.5 text-xs',
                                      answer.is_correct ? 'text-success font-medium' : 'text-muted-foreground',
                                    )}
                                  >
                                    {answer.is_correct ? (
                                      <Check className="size-3" strokeWidth={3} />
                                    ) : (
                                      <X className="size-3" />
                                    )}
                                    {answer.label}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="flex shrink-0 gap-1">
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Modifier la question"
                                onClick={() => setQuestionDialog({ quizId: quiz.id, question })}
                              >
                                <Pencil />
                              </Button>
                              <Button
                                size="icon-sm"
                                variant="ghost"
                                aria-label="Supprimer la question"
                                onClick={() =>
                                  setToDelete({
                                    entity: 'questions',
                                    id: question.id,
                                    label: question.prompt.slice(0, 60),
                                  })
                                }
                              >
                                <Trash2 />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setQuestionDialog({ quizId: quiz.id, question: null })}
                  >
                    <Plus /> Ajouter une question
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* `key` force un remontage à chaque ouverture : l'état du formulaire
          repart des props sans effet de synchronisation. */}
      <QuizDialog
        key={quizDialog && quizDialog !== 'new' ? quizDialog.id : String(quizDialog)}
        state={quizDialog}
        lessonId={lessonId}
        onClose={() => setQuizDialog(null)}
        onSaved={onChanged}
      />

      {/* `key` force un remontage à chaque ouverture : l'état du formulaire
          repart des props sans effet de synchronisation. */}
      <QuestionDialog
        key={questionDialog?.question?.id ?? (questionDialog ? 'new' : 'closed')}
        state={questionDialog}
        answers={questionDialog?.question ? (answersByQuestion.get(questionDialog.question.id) ?? []) : []}
        onClose={() => setQuestionDialog(null)}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Supprimer cet élément ?"
        description={`« ${toDelete?.label} » sera supprimé, ainsi que les tentatives associées. Cette action est définitive.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}

function QuizDialog({
  state,
  lessonId,
  onClose,
  onSaved,
}: {
  state: Tables<'quizzes'> | null | 'new';
  lessonId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const quiz = state === 'new' || state === null ? null : state;

  const [title, setTitle] = React.useState(quiz?.title ?? '');
  const [description, setDescription] = React.useState(quiz?.description ?? '');
  const [passingScore, setPassingScore] = React.useState(String(quiz?.passing_score ?? 60));
  const [maxAttempts, setMaxAttempts] = React.useState(
    quiz?.max_attempts ? String(quiz.max_attempts) : '',
  );
  const [timeLimit, setTimeLimit] = React.useState(
    quiz?.time_limit_seconds ? String(Math.round(quiz.time_limit_seconds / 60)) : '',
  );
  const [shuffle, setShuffle] = React.useState(quiz?.shuffle_questions ?? false);
  const [showExplanations, setShowExplanations] = React.useState(quiz?.show_explanations ?? true);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const result = await upsertQuiz({
      id: quiz?.id,
      lessonId,
      title,
      description,
      passingScore: Number(passingScore),
      maxAttempts: maxAttempts ? Number(maxAttempts) : null,
      timeLimitSeconds: timeLimit ? Number(timeLimit) * 60 : null,
      shuffleQuestions: shuffle,
      showExplanations,
      status: 'published',
      sortOrder: quiz?.sort_order ?? 0,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Quiz enregistré', tone: 'success' });
    onClose();
    onSaved();
  }

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{quiz ? 'Modifier le quiz' : 'Nouveau quiz'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Titre" htmlFor="quiz-title" required>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus />
          </Field>

          <Field label="Description" htmlFor="quiz-description">
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Seuil de réussite (%)" htmlFor="quiz-score">
              <Input
                type="number"
                min={0}
                max={100}
                value={passingScore}
                onChange={(event) => setPassingScore(event.target.value)}
              />
            </Field>
            <Field label="Tentatives" htmlFor="quiz-attempts" hint="Vide = illimité">
              <Input
                type="number"
                min={1}
                value={maxAttempts}
                onChange={(event) => setMaxAttempts(event.target.value)}
              />
            </Field>
            <Field label="Durée (min)" htmlFor="quiz-time" hint="Vide = sans limite">
              <Input
                type="number"
                min={1}
                value={timeLimit}
                onChange={(event) => setTimeLimit(event.target.value)}
              />
            </Field>
          </div>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="quiz-shuffle">Mélanger les questions</Label>
              <Switch id="quiz-shuffle" checked={shuffle} onCheckedChange={setShuffle} />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <Label htmlFor="quiz-explanations">Afficher les explications</Label>
                <p className="text-muted-foreground text-sm">
                  Après correction uniquement, jamais avant.
                </p>
              </div>
              <Switch
                id="quiz-explanations"
                checked={showExplanations}
                onCheckedChange={setShowExplanations}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={pending} disabled={title.trim().length === 0}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DraftAnswer {
  label: string;
  isCorrect: boolean;
  matchPattern: string;
}

function QuestionDialog({
  state,
  answers,
  onClose,
  onSaved,
}: {
  state: { quizId: string; question: Tables<'questions'> | null } | null;
  answers: AnswerRow[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const question = state?.question ?? null;

  const [type, setType] = React.useState<Enums<'question_type'>>(
    question?.type ?? 'single_choice',
  );
  const [prompt, setPrompt] = React.useState(question?.prompt ?? '');
  const [explanation, setExplanation] = React.useState(question?.explanation ?? '');
  const [points, setPoints] = React.useState(String(question?.points ?? 1));
  const [draftAnswers, setDraftAnswers] = React.useState<DraftAnswer[]>(() =>
    answers.length > 0
      ? answers.map((answer) => ({
          label: answer.label,
          isCorrect: answer.is_correct,
          matchPattern: answer.match_pattern ?? '',
        }))
      : defaultAnswers(question?.type ?? 'single_choice'),
  );
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function changeType(next: Enums<'question_type'>) {
    setType(next);
    setDraftAnswers(defaultAnswers(next));
  }

  function toggleCorrect(index: number) {
    setDraftAnswers((current) =>
      current.map((answer, i) => {
        if (type === 'multiple_choice') {
          return i === index ? { ...answer, isCorrect: !answer.isCorrect } : answer;
        }
        // Choix unique et vrai/faux : une seule bonne réponse à la fois.
        return { ...answer, isCorrect: i === index };
      }),
    );
  }

  async function submit() {
    setPending(true);
    setError(null);

    const result = await upsertQuestion({
      id: state?.question?.id,
      quizId: state?.quizId,
      type,
      prompt,
      explanation,
      points: Number(points),
      sortOrder: state?.question?.sort_order ?? 0,
      answers: draftAnswers
        .filter((answer) => answer.label.trim().length > 0)
        .map((answer) => ({
          label: answer.label,
          isCorrect: type === 'short_answer' ? true : answer.isCorrect,
          matchPattern: type === 'short_answer' ? answer.matchPattern || answer.label : undefined,
        })),
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Question enregistrée', tone: 'success' });
    onClose();
    onSaved();
  }

  const typeHint = QUESTION_TYPES.find((option) => option.value === type)?.hint;

  return (
    <Dialog open={state !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{state?.question ? 'Modifier la question' : 'Nouvelle question'}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[65vh] space-y-4 overflow-y-auto pr-1">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Type" htmlFor="question-type" hint={typeHint}>
            <Select value={type} onValueChange={(value) => changeType(value as Enums<'question_type'>)}>
              <SelectTrigger id="question-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {QUESTION_TYPES.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Énoncé" htmlFor="question-prompt" required>
            <Textarea rows={2} value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          </Field>

          <Field label="Points" htmlFor="question-points">
            <Input
              type="number"
              min={0.5}
              step={0.5}
              value={points}
              onChange={(event) => setPoints(event.target.value)}
            />
          </Field>

          <div className="space-y-2">
            <Label>
              {type === 'short_answer' ? 'Réponses acceptées' : 'Réponses'}
              <span className="text-danger ml-0.5">*</span>
            </Label>
            {type === 'short_answer' && (
              <p className="text-muted-foreground text-xs">
                Chaque ligne est une formulation acceptée. La comparaison ignore la casse, les
                accents et les espaces multiples.
              </p>
            )}

            <ul className="space-y-2">
              {draftAnswers.map((answer, index) => (
                <li key={index} className="flex items-center gap-2">
                  {type !== 'short_answer' && (
                    <button
                      type="button"
                      onClick={() => toggleCorrect(index)}
                      aria-label={answer.isCorrect ? 'Bonne réponse' : 'Marquer comme bonne réponse'}
                      aria-pressed={answer.isCorrect}
                      className={cn(
                        'grid size-8 shrink-0 place-items-center rounded-lg border transition-colors',
                        answer.isCorrect
                          ? 'border-success bg-success-muted text-success'
                          : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <Check className="size-4" strokeWidth={3} />
                    </button>
                  )}

                  <Input
                    value={answer.label}
                    onChange={(event) =>
                      setDraftAnswers((current) =>
                        current.map((item, i) =>
                          i === index ? { ...item, label: event.target.value } : item,
                        ),
                      )
                    }
                    placeholder={type === 'short_answer' ? 'Formulation acceptée' : `Réponse ${index + 1}`}
                    disabled={type === 'true_false'}
                  />

                  {type !== 'true_false' && draftAnswers.length > 1 && (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Retirer cette réponse"
                      onClick={() =>
                        setDraftAnswers((current) => current.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 />
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            {type !== 'true_false' && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() =>
                  setDraftAnswers((current) => [
                    ...current,
                    { label: '', isCorrect: false, matchPattern: '' },
                  ])
                }
              >
                <Plus /> Ajouter une réponse
              </Button>
            )}
          </div>

          <Field
            label="Explication"
            htmlFor="question-explanation"
            hint="Affichée après correction. C'est elle qui fait progresser, pas le score."
          >
            <Textarea
              rows={3}
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={pending} disabled={prompt.trim().length === 0}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function defaultAnswers(type: Enums<'question_type'>): DraftAnswer[] {
  if (type === 'true_false') {
    return [
      { label: 'Vrai', isCorrect: true, matchPattern: '' },
      { label: 'Faux', isCorrect: false, matchPattern: '' },
    ];
  }
  if (type === 'short_answer') {
    return [{ label: '', isCorrect: true, matchPattern: '' }];
  }
  return [
    { label: '', isCorrect: true, matchPattern: '' },
    { label: '', isCorrect: false, matchPattern: '' },
    { label: '', isCorrect: false, matchPattern: '' },
  ];
}
