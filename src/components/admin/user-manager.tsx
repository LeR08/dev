'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldCheck, UserX, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { useToast } from '@/components/ui/toast';
import { grantAccess, revokeAccess, setUserActive, setUserRole } from '@/server/actions/admin.actions';
import { formatDate, formatNumber, getFullName, getInitials } from '@/lib/utils';
import type { Enums } from '@/types/database.types';

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: Enums<'user_role'>;
  is_active: boolean;
  xp: number;
  streak_current: number;
  created_at: string;
  avatar_url: string | null;
}

interface EnrollmentRow {
  id: string;
  user_id: string;
  scope: Enums<'access_scope'>;
  expires_at: string | null;
  revoked_at: string | null;
  course?: { title: string } | null;
  subject?: { name: string } | null;
}

const ROLE_LABELS: Record<Enums<'user_role'>, string> = {
  student: 'Membre',
  teacher: 'Formateur',
  admin: 'Administrateur',
};

export function UserManager({
  currentUserId,
  users,
  enrollments,
  courses,
  subjects,
}: {
  currentUserId: string;
  users: UserRow[];
  enrollments: EnrollmentRow[];
  courses: Array<{ id: string; title: string }>;
  subjects: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [search, setSearch] = React.useState('');
  const [granting, setGranting] = React.useState<UserRow | null>(null);
  const [toDisable, setToDisable] = React.useState<UserRow | null>(null);

  const enrollmentsByUser = new Map<string, EnrollmentRow[]>();
  for (const enrollment of enrollments) {
    const list = enrollmentsByUser.get(enrollment.user_id) ?? [];
    list.push(enrollment);
    enrollmentsByUser.set(enrollment.user_id, list);
  }

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      getFullName(user.first_name, user.last_name).toLowerCase().includes(query),
    );
  }, [users, search]);

  async function changeRole(user: UserRow, role: Enums<'user_role'>) {
    const result = await setUserRole(user.id, role);
    if (!result.ok) {
      toast({ title: 'Modification impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Rôle mis à jour', tone: 'success' });
    router.refresh();
  }

  async function toggleActive(user: UserRow) {
    const result = await setUserActive(user.id, !user.is_active);
    if (!result.ok) {
      toast({ title: 'Modification impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: result.message ?? '', tone: 'success' });
    router.refresh();
  }

  async function handleRevoke(enrollmentId: string) {
    const result = await revokeAccess(enrollmentId);
    if (!result.ok) {
      toast({ title: 'Révocation impossible', description: result.error, tone: 'error' });
      return;
    }
    toast({ title: 'Accès révoqué', tone: 'success' });
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <SearchInput
        value={search}
        onValueChange={setSearch}
        placeholder="Rechercher un membre par nom…"
        className="max-w-md"
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={users.length === 0 ? 'Aucun membre inscrit' : 'Aucun membre ne correspond'}
        />
      ) : (
        <ul className="bg-card divide-y rounded-xl border">
          {filtered.map((user) => {
            const access = enrollmentsByUser.get(user.id) ?? [];
            const isSelf = user.id === currentUserId;

            return (
              <li key={user.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar>
                  {user.avatar_url && <AvatarImage src={user.avatar_url} alt="" />}
                  <AvatarFallback>{getInitials(user.first_name, user.last_name)}</AvatarFallback>
                </Avatar>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {getFullName(user.first_name, user.last_name) || 'Sans nom'}
                    {isSelf && <span className="text-muted-foreground ml-1.5 text-xs">(vous)</span>}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    Inscrit le {formatDate(user.created_at)} · {formatNumber(user.xp)} XP ·{' '}
                    {user.streak_current} j de série
                  </p>
                  {access.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {access.map((enrollment) => (
                        <button
                          key={enrollment.id}
                          type="button"
                          onClick={() => handleRevoke(enrollment.id)}
                          title="Cliquer pour révoquer cet accès"
                          className="hover:bg-danger-muted hover:text-danger bg-success-muted text-success rounded px-1.5 py-0.5 text-[0.6875rem] font-medium transition-colors"
                        >
                          {enrollment.scope === 'all'
                            ? 'Catalogue complet'
                            : (enrollment.course?.title ?? enrollment.subject?.name ?? 'Accès')}
                          {enrollment.expires_at && ` · exp. ${formatDate(enrollment.expires_at)}`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {!user.is_active && <Badge variant="danger">Désactivé</Badge>}

                <Select
                  value={user.role}
                  onValueChange={(value) => changeRole(user, value as Enums<'user_role'>)}
                  disabled={isSelf}
                >
                  <SelectTrigger className="w-40 shrink-0" aria-label={`Rôle de ${user.first_name}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(ROLE_LABELS) as Enums<'user_role'>[]).map((role) => (
                      <SelectItem key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex shrink-0 gap-1">
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Accorder un accès"
                    onClick={() => setGranting(user)}
                  >
                    <KeyRound />
                  </Button>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label={user.is_active ? 'Désactiver le compte' : 'Réactiver le compte'}
                    disabled={isSelf}
                    onClick={() => (user.is_active ? setToDisable(user) : toggleActive(user))}
                  >
                    {user.is_active ? <UserX /> : <ShieldCheck />}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <GrantDialog
        user={granting}
        courses={courses}
        subjects={subjects}
        onClose={() => setGranting(null)}
        onGranted={() => router.refresh()}
      />

      <ConfirmDialog
        open={toDisable !== null}
        onOpenChange={(open) => !open && setToDisable(null)}
        title="Désactiver ce compte ?"
        description="Le membre ne pourra plus se connecter. Sa progression est conservée et le compte peut être réactivé à tout moment."
        confirmLabel="Désactiver"
        destructive
        onConfirm={async () => {
          if (toDisable) await toggleActive(toDisable);
        }}
      />
    </div>
  );
}

function GrantDialog({
  user,
  courses,
  subjects,
  onClose,
  onGranted,
}: {
  user: UserRow | null;
  courses: Array<{ id: string; title: string }>;
  subjects: Array<{ id: string; name: string }>;
  onClose: () => void;
  onGranted: () => void;
}) {
  const { toast } = useToast();
  const [scope, setScope] = React.useState<'all' | 'subject' | 'course'>('all');
  const [targetId, setTargetId] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!user) return;
    setScope('all');
    setTargetId('');
    setError(null);
  }, [user]);

  async function submit() {
    if (!user) return;
    setPending(true);
    setError(null);

    const result = await grantAccess(user.id, scope, scope === 'all' ? null : targetId);
    setPending(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    toast({ title: 'Accès accordé', tone: 'success' });
    onClose();
    onGranted();
  }

  return (
    <Dialog open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Accorder un accès</DialogTitle>
          <DialogDescription>
            À utiliser pour un accès offert ou un dépannage. Pour une vente, générez plutôt un code
            d&apos;activation.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="bg-danger-muted text-danger rounded-lg px-3 py-2 text-sm" role="alert">
              {error}
            </p>
          )}

          <Field label="Portée" htmlFor="grant-scope">
            <Select
              value={scope}
              onValueChange={(value) => {
                setScope(value as typeof scope);
                setTargetId('');
              }}
            >
              <SelectTrigger id="grant-scope">
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
            <Field label={scope === 'course' ? 'Formation' : 'Domaine'} htmlFor="grant-target" required>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="grant-target">
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
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Annuler
          </Button>
          <Button onClick={submit} loading={pending} disabled={scope !== 'all' && !targetId}>
            Accorder
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
