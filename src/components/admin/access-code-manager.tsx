'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, Download, KeyRound, Plus, Power } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { SearchInput } from '@/components/shared/search-input';
import { EmptyState } from '@/components/shared/states';
import { useToast } from '@/components/ui/toast';
import { generateAccessCodes, setAccessCodeActive } from '@/server/actions/admin.actions';
import { formatDate } from '@/lib/utils';
import type { Tables } from '@/types/database.types';

type CodeRow = Tables<'access_codes'> & {
  course?: { title: string } | null;
  subject?: { name: string } | null;
};

export function AccessCodeManager({
  codes,
  courses,
  subjects,
}: {
  codes: CodeRow[];
  courses: Array<{ id: string; title: string }>;
  subjects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = React.useState('');
  const [generating, setGenerating] = React.useState(false);
  const [generated, setGenerated] = React.useState<string[] | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return codes;
    return codes.filter(
      (code) =>
        code.code.toLowerCase().includes(query) ||
        (code.label ?? '').toLowerCase().includes(query),
    );
  }, [codes, search]);

  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      toast({ title: 'Copie impossible', description: 'Copiez le code manuellement.', tone: 'error' });
    }
  }

  async function toggleActive(code: CodeRow) {
    const result = await setAccessCodeActive(code.id, !code.is_active);
    if (!result.ok) {
      toast({ title: 'Modification impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: result.message ?? '', tone: 'success' });
    router.refresh();
  }

  function exportCsv() {
    const rows = [
      ['code', 'portee', 'cible', 'utilisations', 'max', 'actif', 'cree_le'],
      ...filtered.map((code) => [
        code.code,
        code.scope,
        code.course?.title ?? code.subject?.name ?? 'Catalogue complet',
        String(code.uses_count),
        String(code.max_uses),
        code.is_active ? 'oui' : 'non',
        code.created_at.slice(0, 10),
      ]),
    ];

    const csv = rows.map((row) => row.map((cell) => `"${cell}"`).join(';')).join('\n');
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `codes-acces-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        <SearchInput
          value={search}
          onValueChange={setSearch}
          placeholder="Rechercher un code ou un libellé…"
          className="min-w-56 flex-1"
        />
        <Button variant="secondary" onClick={exportCsv} disabled={filtered.length === 0}>
          <Download /> Exporter en CSV
        </Button>
        <Button onClick={() => setGenerating(true)}>
          <Plus /> Générer des codes
        </Button>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title={codes.length === 0 ? 'Aucun code généré' : 'Aucun code ne correspond'}
          description={
            codes.length === 0
              ? 'Générez un lot de codes à envoyer à vos acheteurs.'
              : 'Essayez un autre terme de recherche.'
          }
          action={
            codes.length === 0
              ? { label: 'Générer des codes', onClick: () => setGenerating(true) }
              : undefined
          }
        />
      ) : (
        <div className="bg-card overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Portée</th>
                <th className="px-4 py-2.5 text-left font-medium">Libellé</th>
                <th className="px-4 py-2.5 text-left font-medium">Utilisations</th>
                <th className="px-4 py-2.5 text-left font-medium">Créé le</th>
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((code) => {
                const exhausted = code.uses_count >= code.max_uses;
                return (
                  <tr key={code.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-2.5">
                      <button
                        type="button"
                        onClick={() => copy(code.code)}
                        className="hover:text-primary inline-flex items-center gap-1.5 font-mono text-xs font-medium transition-colors"
                        title="Copier"
                      >
                        {code.code}
                        {copied === code.code ? (
                          <Check className="text-success size-3.5" />
                        ) : (
                          <Copy className="size-3.5 opacity-50" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-muted-foreground text-xs">
                        {code.scope === 'all'
                          ? 'Catalogue complet'
                          : (code.course?.title ?? code.subject?.name ?? '—')}
                      </span>
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs">{code.label ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs tabular-nums">
                      {code.uses_count} / {code.max_uses}
                    </td>
                    <td className="text-muted-foreground px-4 py-2.5 text-xs">
                      {formatDate(code.created_at)}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center justify-end gap-2">
                        {!code.is_active ? (
                          <Badge variant="danger">Désactivé</Badge>
                        ) : exhausted ? (
                          <Badge variant="warning">Épuisé</Badge>
                        ) : (
                          <Badge variant="success">Actif</Badge>
                        )}
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          aria-label={code.is_active ? 'Désactiver' : 'Réactiver'}
                          onClick={() => toggleActive(code)}
                        >
                          <Power />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <GenerateDialog
        open={generating}
        onOpenChange={setGenerating}
        courses={courses}
        subjects={subjects}
        onGenerated={(list) => {
          setGenerated(list);
          router.refresh();
        }}
      />

      <Dialog open={generated !== null} onOpenChange={(open) => !open && setGenerated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{generated?.length} code(s) généré(s)</DialogTitle>
            <DialogDescription>
              Copiez-les maintenant : ils restent consultables dans la liste, mais ce récapitulatif
              ne s&apos;affichera plus.
            </DialogDescription>
          </DialogHeader>

          <pre className="bg-muted max-h-64 overflow-auto rounded-lg p-3 font-mono text-xs">
            {generated?.join('\n')}
          </pre>

          <DialogFooter>
            <Button variant="secondary" onClick={() => copy((generated ?? []).join('\n'))}>
              <Copy /> Tout copier
            </Button>
            <Button onClick={() => setGenerated(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
  courses,
  subjects,
  onGenerated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courses: Array<{ id: string; title: string }>;
  subjects: Array<{ id: string; name: string }>;
  onGenerated: (codes: string[]) => void;
}) {
  const { toast } = useToast();
  const [count, setCount] = React.useState('10');
  const [scope, setScope] = React.useState<'all' | 'subject' | 'course'>('all');
  const [targetId, setTargetId] = React.useState('');
  const [maxUses, setMaxUses] = React.useState('1');
  const [accessDays, setAccessDays] = React.useState('');
  const [label, setLabel] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function submit() {
    setPending(true);
    setError(null);

    const result = await generateAccessCodes({
      count: Number(count),
      scope,
      courseId: scope === 'course' ? targetId : null,
      subjectId: scope === 'subject' ? targetId : null,
      maxUses: Number(maxUses),
      accessDays: accessDays ? Number(accessDays) : null,
      label,
    });

    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: result.message ?? 'Codes générés', tone: 'success' });
    onOpenChange(false);
    onGenerated(result.data.codes);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Générer des codes d&apos;activation</DialogTitle>
          <DialogDescription>
            Un code par vente (1 utilisation), ou un code de campagne partagé (plusieurs
            utilisations).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nombre de codes" htmlFor="code-count" required>
              <Input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(event) => setCount(event.target.value)}
              />
            </Field>
            <Field
              label="Utilisations par code"
              htmlFor="code-uses"
              hint="1 = code nominatif."
            >
              <Input
                type="number"
                min={1}
                value={maxUses}
                onChange={(event) => setMaxUses(event.target.value)}
              />
            </Field>
          </div>

          <Field label="Portée de l'accès" htmlFor="code-scope">
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as typeof scope);
                setTargetId('');
              }}
            >
              <SelectTrigger id="code-scope">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Catalogue complet</SelectItem>
                <SelectItem value="subject">Un domaine</SelectItem>
                <SelectItem value="course">Une formation</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {scope !== 'all' && (
            <Field label={scope === 'course' ? 'Formation' : 'Domaine'} htmlFor="code-target" required>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="code-target">
                  <SelectValue placeholder="Choisir" />
                </SelectTrigger>
                <SelectContent>
                  {(scope === 'course' ? courses : subjects).map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {'title' in item ? item.title : item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Durée d'accès (jours)"
              htmlFor="code-days"
              hint="Vide = accès à vie."
            >
              <Input
                type="number"
                min={1}
                value={accessDays}
                onChange={(event) => setAccessDays(event.target.value)}
                placeholder="365"
              />
            </Field>
            <Field label="Libellé interne" htmlFor="code-label" hint="Pour vous y retrouver.">
              <Input
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Lancement janvier"
              />
            </Field>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={submit}
            loading={pending}
            disabled={scope !== 'all' && !targetId}
          >
            Générer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
