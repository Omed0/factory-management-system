import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { z } from 'zod';
import { toast } from 'sonner';
import { Database, Download, Loader2, PlayCircle } from 'lucide-react';

import { getSupabaseAdmin, getSupabaseServer } from '~/lib/supabase.server';
import { requireUser } from '~/lib/auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';

interface BackupRun {
  id: number;
  kind: 'scheduled' | 'manual';
  destination: 'r2' | 'supabase' | 'local' | 'vps';
  storage_key: string | null;
  size_bytes: number | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  error: string | null;
}

const listRuns = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('backup_runs').select('*').order('started_at', { ascending: false }).limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as BackupRun[];
});

const loadConfig = createServerFn({ method: 'GET' }).handler(async () => {
  const sb = getSupabaseServer()
  const { data, error } = await sb.from('site_settings').select('backup_provider, backup_keep_n, backup_cron, backup_last_run_at, backup_last_status').eq('id', 1).single();
  if (error) throw new Error(error.message);
  return data;
});

const ConfigSchema = z.object({
  backup_provider: z.enum(['r2', 'supabase', 'local', 'vps']),
  backup_keep_n: z.coerce.number().int().min(1).max(50),
  backup_cron: z.string().min(9), // crude cron-ish check
});
const saveConfig = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => ConfigSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('only OWNER may change backup config');
    const sb = getSupabaseServer()
    const { error } = await sb.from('site_settings').update(data).eq('id', 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const triggerManual = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ destination: z.enum(['r2', 'supabase', 'local', 'vps']).optional() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    const sb = getSupabaseServer()
    const { data: ok } = await sb.rpc('has_permission', { p_resource: 'backups', p_action: 'run' });
    if (!ok) throw new Error('forbidden');

    const fnUrl = `${process.env.SUPABASE_URL}/functions/v1/backup`;
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ kind: 'manual', destination: data.destination }),
    });
    if (!res.ok) throw new Error(`Backup function failed (${res.status})`);
    return res.json();
  });

const downloadKey = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('forbidden');
    const sb = getSupabaseAdmin()
    const { data: blob, error } = await sb.storage.from('backups').createSignedUrl(data.key, 60);
    if (error || !blob) throw new Error(error?.message ?? 'sign failed');
    return { url: blob.signedUrl };
  });

export const Route = createFileRoute('/app/settings/backups')({
  beforeLoad: async () => {
    const me = await requireUser();
    if (!['OWNER','ADMIN'].includes(me.role)) throw redirect({ to: '/app/dashboard' });
    return { me };
  },
  component: BackupsTab,
});

function BackupsTab() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const runs   = useQuery({ queryKey: ['backup-runs'], queryFn: listRuns, refetchInterval: 10_000 });
  const config = useQuery({ queryKey: ['backup-config'], queryFn: loadConfig });

  const trigger = useMutation({
    mutationFn: () => triggerManual({ data: {} }),
    onSuccess: () => { toast.success('Backup triggered'); qc.invalidateQueries({ queryKey: ['backup-runs'] }); },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed'),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Backups</h2>
          <p className="text-sm text-muted-foreground">
            {config.data?.backup_last_run_at
              ? `Last run: ${new Date(config.data.backup_last_run_at).toLocaleString()} (${config.data.backup_last_status ?? 'unknown'})`
              : 'No backups yet'}
          </p>
        </div>
        <Button onClick={() => trigger.mutate()} disabled={trigger.isPending}>
          {trigger.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
          Run backup now
        </Button>
      </div>

      {me.role === 'OWNER' && config.data && <ConfigCard config={config.data as any} />}

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr><th className="text-start p-2">Started</th><th className="text-start p-2">Kind</th><th className="text-start p-2">Dest.</th><th className="text-start p-2">Size</th><th className="text-start p-2">Status</th><th></th></tr>
            </thead>
            <tbody>
              {(runs.data ?? []).map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="p-2">{new Date(r.started_at).toLocaleString()}</td>
                  <td className="p-2">{r.kind}</td>
                  <td className="p-2"><Database className="inline h-3 w-3 me-1" />{r.destination}</td>
                  <td className="p-2">{r.size_bytes ? `${(r.size_bytes/1024/1024).toFixed(1)} MB` : '—'}</td>
                  <td className={`p-2 ${r.status === 'failed' ? 'text-destructive' : r.status === 'success' ? 'text-accent' : ''}`}>
                    {r.status}{r.error ? ` — ${r.error}` : ''}
                  </td>
                  <td className="p-2 text-end">
                    {r.storage_key && r.destination === 'supabase' && (
                      <Button size="sm" variant="ghost" onClick={async () => {
                        try {
                          const { url } = await downloadKey({ data: { key: r.storage_key! } });
                          window.location.href = url;
                        } catch (e) { toast.error(e instanceof Error ? e.message : 'Download failed'); }
                      }}>
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigCard({ config }: { config: { backup_provider: string; backup_keep_n: number; backup_cron: string } }) {
  const qc = useQueryClient();
  const form = useForm({
    defaultValues: {
      backup_provider: config.backup_provider as 'r2' | 'supabase' | 'local' | 'vps',
      backup_keep_n: config.backup_keep_n,
      backup_cron: config.backup_cron,
    },
    onSubmit: async ({ value }) => {
      try {
        await saveConfig({ data: value });
        toast.success('Config saved (cron rescheduled)');
        qc.invalidateQueries({ queryKey: ['backup-config'] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    },
  });
  return (
    <Card>
      <CardHeader><CardTitle>Configuration (OWNER only)</CardTitle></CardHeader>
      <CardContent>
        <form className="grid sm:grid-cols-3 gap-4 items-end" onSubmit={(e) => { e.preventDefault(); form.handleSubmit(); }}>
          <form.Field name="backup_provider">{(f) => (
            <div className="grid gap-1.5">
              <Label>Provider</Label>
              <Select value={f.state.value} onValueChange={(v) => f.handleChange(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="r2">Cloudflare R2</SelectItem>
                  <SelectItem value="supabase">Supabase Storage</SelectItem>
                  <SelectItem value="local">This computer (manual only)</SelectItem>
                  <SelectItem value="vps">VPS filesystem (manual only)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}</form.Field>
          <form.Field name="backup_keep_n">{(f) => (
            <div className="grid gap-1.5">
              <Label>Keep last N</Label>
              <Input type="number" min={1} max={50} value={f.state.value} onChange={(e) => f.handleChange(Number(e.target.value))} />
            </div>
          )}</form.Field>
          <form.Field name="backup_cron">{(f) => (
            <div className="grid gap-1.5">
              <Label>Cron schedule (UTC)</Label>
              <Input value={f.state.value} onChange={(e) => f.handleChange(e.target.value)} placeholder="0 3 * * *" />
            </div>
          )}</form.Field>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" disabled={form.state.isSubmitting}>Save config</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
