import {
  createFileRoute,
  Outlet,
  Link,
  useLocation,
} from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import { cn } from "~/lib/utils";
import { can, ESSENTIAL_PERMISSIONS } from "~/lib/auth";

export const Route = createFileRoute("/app/settings")({
  component: SettingsLayout,
  notFoundComponent: () => (
    <div className="p-4">Select a settings category from the tabs above.</div>
  ),
});

function SettingsLayout() {
  const { pathname } = useLocation();
  const parent = Route.useRouteContext() as {
    permissions?: string[];
    catalogCount?: number;
  };
  const permissions = parent.permissions ?? [];
  const catalogCount = parent.catalogCount ?? 0;
  const expectedCount = ESSENTIAL_PERMISSIONS.length;
  const catalogStale = catalogCount > 0 && catalogCount < expectedCount;
  const catalogEmpty = catalogCount === 0;

  const tabs = [
    {
      id: "branding",
      label: "Branding",
      href: "/app/settings/branding",
      show: true,
    },
    {
      id: "users",
      label: "Users & Permissions",
      href: "/app/settings/users",
      show: true,
    },
    {
      id: "backups",
      label: "Backups",
      href: "/app/settings/backups",
      show: true,
    },
    {
      id: "trash",
      label: "Trash",
      href: "/app/settings/trash",
      show: can(permissions, "trash", "manage"),
    },
  ].filter((t) => t.show);

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>

      {(catalogStale || catalogEmpty) && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-900/20 p-3 text-sm">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-amber-900 dark:text-amber-100">
            <p className="font-medium">Permission catalog appears incomplete</p>
            <p className="text-xs mt-0.5 text-amber-800 dark:text-amber-200">
              Found {catalogCount} of {expectedCount} expected permissions. Some
              recent migrations may not have been applied. Run pending
              migrations from{" "}
              <code className="px-1 rounded bg-amber-100 dark:bg-amber-900/40">
                supabase/migrations/
              </code>{" "}
              to fix. Owner/admin access falls back to a built-in baseline so
              the app keeps working.
            </p>
          </div>
        </div>
      )}

      <div className="flex gap-4 border-b border-border mb-6 overflow-x-auto">
        {tabs.map((t) => {
          const active = pathname.startsWith(t.href);
          return (
            <Link
              key={t.id}
              to={t.href}
              className={cn(
                "pb-3 text-sm font-medium border-b-2 whitespace-nowrap",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
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
