'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Plus, Target, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
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
import { useToast } from '@/components/ui/toast';
import { deactivateGoal, upsertGoal } from '@/server/actions/engagement.actions';
import type { Enums } from '@/types/database.types';

const GOAL_TYPES: Array<{ value: Enums<'goal_type'>; label: string; unit: string; suggestion: number }> = [
  { value: 'daily_minutes', label: "Minutes d'étude par jour", unit: 'min', suggestion: 30 },
  { value: 'weekly_minutes', label: "Minutes d'étude par semaine", unit: 'min', suggestion: 180 },
  { value: 'daily_lessons', label: 'Leçons par jour', unit: 'leçons', suggestion: 2 },
  { value: 'weekly_lessons', label: 'Leçons par semaine', unit: 'leçons', suggestion: 10 },
];

interface Goal {
  id: string;
  type: Enums<'goal_type'>;
  target_value: number;
}

interface Period {
  goal_id: string;
  period_start: string;
  achieved_value: number;
  target_value: number;
  achieved: boolean;
}

export function GoalManager({ goals, periods }: { goals: Goal[]; periods: Period[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [adding, setAdding] = React.useState(goals.length === 0);
  const [type, setType] = React.useState<Enums<'goal_type'>>('daily_minutes');
  const [value, setValue] = React.useState('30');
  const [pending, setPending] = React.useState(false);
  const [toDelete, setToDelete] = React.useState<string | null>(null);

  const usedTypes = new Set(goals.map((goal) => goal.type));
  const availableTypes = GOAL_TYPES.filter((option) => !usedTypes.has(option.value));

  const currentPeriodByGoal = new Map<string, Period>();
  for (const period of periods) {
    if (!currentPeriodByGoal.has(period.goal_id)) currentPeriodByGoal.set(period.goal_id, period);
  }

  async function handleAdd() {
    setPending(true);
    const result = await upsertGoal({ type, targetValue: Number(value) });
    setPending(false);

    if (!result.ok) {
      toast({ title: 'Enregistrement impossible', description: result.error, tone: 'error' });
      return;
    }

    toast({ title: 'Objectif enregistré', tone: 'success' });
    setAdding(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    const result = await deactivateGoal(id);
    if (!result.ok) {
      toast({ title: 'Suppression impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Objectif retiré', tone: 'success' });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {goals.length === 0 && !adding ? (
        <EmptyState
          icon={Target}
          title="Aucun objectif défini"
          description="Fixez-vous un rythme : la plateforme suit automatiquement votre avancement."
          action={{ label: 'Définir un objectif', onClick: () => setAdding(true) }}
        />
      ) : (
        <ul className="space-y-3">
          {goals.map((goal) => {
            const option = GOAL_TYPES.find((item) => item.value === goal.type);
            const period = currentPeriodByGoal.get(goal.id);
            const achieved = period?.achieved_value ?? 0;
            const percent = Math.min(100, (achieved / goal.target_value) * 100);

            return (
              <li key={goal.id} className="bg-card space-y-3 rounded-xl border p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{option?.label}</p>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      {achieved} / {goal.target_value} {option?.unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {percent >= 100 && (
                      <Badge variant="success">
                        <Check /> Atteint
                      </Badge>
                    )}
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Retirer cet objectif"
                      onClick={() => setToDelete(goal.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Progress value={percent} tone={percent >= 100 ? 'success' : 'primary'} />
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <div className="bg-card space-y-4 rounded-xl border p-5">
          <p className="font-medium">Nouvel objectif</p>

          <div className="grid gap-4 sm:grid-cols-[1fr_9rem]">
            <Field label="Type d'objectif" htmlFor="goal-type">
              <Select
                value={type}
                onValueChange={(next) => {
                  const parsed = next as Enums<'goal_type'>;
                  setType(parsed);
                  setValue(String(GOAL_TYPES.find((o) => o.value === parsed)?.suggestion ?? 30));
                }}
              >
                <SelectTrigger id="goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(availableTypes.length > 0 ? availableTypes : GOAL_TYPES).map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Cible" htmlFor="goal-value">
              <Input
                type="number"
                min={1}
                max={1440}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            {goals.length > 0 && (
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Annuler
              </Button>
            )}
            <Button loading={pending} onClick={handleAdd} disabled={Number(value) < 1}>
              Enregistrer
            </Button>
          </div>
        </div>
      ) : (
        availableTypes.length > 0 && (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            <Plus /> Ajouter un objectif
          </Button>
        )
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Retirer cet objectif ?"
        description="Votre historique de progression est conservé."
        confirmLabel="Retirer"
        destructive
        onConfirm={async () => {
          if (toDelete) await handleDelete(toDelete);
        }}
      />
    </div>
  );
}
