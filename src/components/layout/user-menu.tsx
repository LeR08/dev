'use client';

import Link from 'next/link';
import { LogOut, Settings, ShieldCheck, User as UserIcon, KeyRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { signOut } from '@/server/actions/auth.actions';
import { routes } from '@/lib/constants/routes';
import { getFullName, getInitials } from '@/lib/utils';
import type { Enums } from '@/types/database.types';

export function UserMenu({
  firstName,
  lastName,
  email,
  avatarUrl,
  role,
}: {
  firstName: string | null;
  lastName: string | null;
  email: string;
  avatarUrl: string | null;
  role: Enums<'user_role'>;
}) {
  const fullName = getFullName(firstName, lastName) || email;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:outline-none">
        <Avatar>
          {avatarUrl && <AvatarImage src={avatarUrl} alt="" />}
          <AvatarFallback>{getInitials(firstName, lastName)}</AvatarFallback>
        </Avatar>
        <span className="sr-only">Ouvrir le menu du compte</span>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="py-2">
          <span className="text-foreground block text-sm font-medium">{fullName}</span>
          <span className="text-muted-foreground block truncate text-xs">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href={routes.profile}>
            <UserIcon /> Mon profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.activate}>
            <KeyRound /> Activer un code
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={routes.settings}>
            <Settings /> Paramètres
          </Link>
        </DropdownMenuItem>

        {role !== 'student' && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={routes.admin}>
                <ShieldCheck /> Administration
              </Link>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          destructive
          onSelect={(event) => {
            event.preventDefault();
            void signOut();
          }}
        >
          <LogOut /> Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
