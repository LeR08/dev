import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { routes } from '@/lib/constants/routes';

const tabs = [
  { href: routes.settings, label: 'Compte' },
  { href: routes.settingsSecurity, label: 'Sécurité' },
  { href: routes.settingsNotifications, label: 'Notifications' },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl space-y-7">
      <PageHeader title="Paramètres" description="Votre compte, votre sécurité et vos préférences." />

      <nav className="flex gap-1 overflow-x-auto border-b" aria-label="Sections des paramètres">
        {tabs.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="hover:text-foreground text-muted-foreground relative px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  );
}
