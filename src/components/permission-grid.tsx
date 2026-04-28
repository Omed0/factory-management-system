import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { Button } from '~/components/ui/button';

interface CatalogRow { resource: string; action: string; label: string; }
interface Grant      { resource: string; action: string; }

interface Props {
  catalog: CatalogRow[];
  initialGrants: Grant[];
  /** Server fn that replaces the user's grants atomically. */
  onSave: (grants: Grant[]) => Promise<void>;
  disabled?: boolean;
}

/**
 * Grid of (resource x action) checkboxes. Used in the user-edit dialog so
 * an admin can toggle per-section permissions for a USER. OWNER/ADMIN rows
 * should pass `disabled` to prevent edits (their access is role-derived).
 */
export function PermissionGrid({ catalog, initialGrants, onSave, disabled }: Props) {
  const [grants, setGrants] = useState(() => new Set(initialGrants.map((g) => `${g.resource}:${g.action}`)));
  const grouped = useMemo(() => {
    const m = new Map<string, CatalogRow[]>();
    for (const c of catalog) {
      if (!m.has(c.resource)) m.set(c.resource, []);
      m.get(c.resource)!.push(c);
    }
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [catalog]);

  const save = useMutation({
    mutationFn: async () => {
      const next: Grant[] = [...grants].map((k) => {
        const [resource, action] = k.split(':');
        return { resource: resource!, action: action! };
      });
      await onSave(next);
    },
    onSuccess: () => {},
  });

  const toggle = (k: string) => {
    setGrants((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-auto rounded-md border border-border p-3">
        {grouped.map(([resource, rows]) => (
          <div key={resource}>
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">{resource}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {rows.map((row) => {
                const k = `${row.resource}:${row.action}`;
                return (
                  <label key={k} className="flex items-center gap-2 text-sm cursor-pointer rounded p-1 hover:bg-muted">
                    <input
                      type="checkbox"
                      disabled={disabled}
                      checked={grants.has(k)}
                      onChange={() => toggle(k)}
                    />
                    <span>{row.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={disabled || save.isPending}>
          {save.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save permissions
        </Button>
      </div>
    </div>
  );
}
