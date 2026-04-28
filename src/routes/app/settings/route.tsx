import { createFileRoute, Outlet, Link, useLocation } from '@tanstack/react-router';
import { cn } from '~/lib/utils';

export const Route = createFileRoute('/app/settings')({
  component: SettingsLayout,
});

function SettingsLayout() {
  const { pathname } = useLocation();
  const tabs = [
    { id: 'branding', label: 'Branding', href: '/app/settings/branding' },
    { id: 'users',    label: 'Users & Permissions', href: '/app/settings/users' },
    { id: 'backups',  label: 'Backups', href: '/app/settings/backups' },
  ];
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <div className="flex gap-4 border-b border-border mb-6">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.id}
              to={t.href}
              className={cn(
                'pb-3 text-sm font-medium border-b-2',
                active ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      <Outlet />
    </div>
  );
}
