import { createFileRoute, redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from '@tanstack/react-form';
import { useRef, useState } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { CheckCircle, Database, Download, Loader2, PlayCircle, RotateCcw, Upload, XCircle } from 'lucide-react';

import { getSupabaseAdmin, getSupabaseServer } from '~/lib/supabase.server';
import { requireUser } from '~/lib/auth';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '~/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Skeleton } from '~/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '~/components/ui/alert-dialog';

// ─── constants ───────────────────────────────────────────────────────────────

const SCHEDULE_PRESETS = [
  { label: 'Every night at 3:00 AM (recommended)', value: '0 3 * * *' },
  { label: 'Every night at midnight', value: '0 0 * * *' },
  { label: 'Twice daily (noon & midnight)', value: '0 0,12 * * *' },
  { label: 'Every Sunday at 3:00 AM', value: '0 3 * * 0' },
  { label: 'Custom cron expression…', value: 'custom' },
];

// All public tables — dumped in order, restored in FK-safe order below.
const BACKUP_TABLES = [
  'site_settings', 'profiles', 'customers', 'products', 'companies',
  'company_purchases', 'purchase_payments', 'sales', 'sale_items',
  'dollar', 'dollar_history', 'employees', 'employee_actions',
  'expenses', 'paid_loans', 'permission_catalog', 'user_permissions', 'backup_runs',
];

// Tables skipped during restore (system / auth-linked).
const RESTORE_SKIP = new Set(['profiles', 'permission_catalog', 'backup_runs']);

// site_settings columns excluded from restore (credentials + setup flag stay intact).
const SITE_SETTINGS_RESTORE_EXCLUDE = new Set([
  'id', 'setup_completed',
  'backup_provider', 'backup_keep_n', 'backup_cron',
  'backup_last_run_at', 'backup_last_status',
  'r2_endpoint', 'r2_bucket', 'r2_access_key_id', 'r2_secret_access_key',
]);

// Delete order: children first so FK constraints are never violated.
const RESTORE_DELETE_ORDER = [
  'paid_loans', 'sale_items', 'purchase_payments', 'employee_actions',
  'user_permissions', 'dollar_history', 'sales', 'company_purchases',
  'expenses', 'dollar', 'customers', 'products', 'companies', 'employees',
];

// Insert order: parents first.
const RESTORE_INSERT_ORDER = [
  'employees', 'companies', 'products', 'customers', 'dollar', 'expenses',
  'sales', 'company_purchases', 'dollar_history', 'user_permissions',
  'employee_actions', 'purchase_payments', 'sale_items', 'paid_loans',
];

// ─── server-only helpers ─────────────────────────────────────────────────────

async function generateDump(
  admin: ReturnType<typeof getSupabaseAdmin>,
): Promise<{ bytes: Buffer; filename: string }> {
  const { gzipSync } = await import('node:zlib');
  const lines: string[] = [`-- FMS backup ${new Date().toISOString()}`];
  const PAGE = 1000;

  for (const table of BACKUP_TABLES) {
    let from = 0;
    let hasRows = false;
    for (; ;) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (admin.from(table as any) as any)
        .select('*')
        .range(from, from + PAGE - 1);
      if (error) { lines.push(`-- TABLE ${table} ERROR: ${error.message}`); break; }
      if (!data || data.length === 0) {
        if (!hasRows) lines.push(`-- TABLE ${table} (empty)`);
        break;
      }
      if (!hasRows) { lines.push(`-- TABLE ${table}`); hasRows = true; }
      for (const row of data) lines.push(JSON.stringify({ t: table, r: row }));
      if (data.length < PAGE) break;
      from += PAGE;
    }
  }

  const bytes = gzipSync(Buffer.from(lines.join('\n'), 'utf8'));
  const filename = `fms-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson.gz`;
  return { bytes: Buffer.from(bytes), filename };
}

async function getR2Credentials(admin: ReturnType<typeof getSupabaseAdmin>) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (admin.from('site_settings') as any)
    .select('r2_endpoint, r2_bucket, r2_access_key_id, r2_secret_access_key')
    .eq('id', 1)
    .single();
  return {
    endpoint: (data?.r2_endpoint as string | null) || process.env.R2_ENDPOINT || '',
    bucket: (data?.r2_bucket as string | null) || process.env.R2_BUCKET || 'fms-backups',
    accessKeyId: (data?.r2_access_key_id as string | null) || process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: (data?.r2_secret_access_key as string | null) || process.env.R2_SECRET_ACCESS_KEY || '',
  };
}

async function rotateBackups(
  admin: ReturnType<typeof getSupabaseAdmin>,
  destination: string,
  keepN: number,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: rows } = await (admin.from('backup_runs') as any)
    .select('id, storage_key')
    .eq('destination', destination)
    .eq('status', 'success')
    .order('started_at', { ascending: false });

  if (!rows || rows.length <= keepN) return;
  for (const r of rows.slice(keepN)) {
    if (r.storage_key) {
      try {
        if (destination === 'r2') {
          const { S3Client, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
          const r2 = await getR2Credentials(admin);
          const s3 = new S3Client({
            region: 'auto',
            endpoint: r2.endpoint,
            credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
          });
          await s3.send(new DeleteObjectCommand({ Bucket: r2.bucket, Key: r.storage_key }));
        } else if (destination === 'supabase') {
          await admin.storage.from('backups').remove([r.storage_key]);
        }
      } catch (e) {
        console.warn(`rotate: failed to delete ${r.storage_key}`, e);
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('backup_runs') as any).delete().eq('id', r.id);
  }
}

// Downloads the raw bytes of a backup file from wherever it was stored.
async function downloadBackupBytes(
  admin: ReturnType<typeof getSupabaseAdmin>,
  destination: string,
  storageKey: string,
): Promise<Buffer> {
  if (destination === 'supabase') {
    const { data: blob, error } = await admin.storage.from('backups').download(storageKey);
    if (error || !blob) throw new Error(error?.message ?? 'download failed');
    return Buffer.from(await blob.arrayBuffer());
  }

  if (destination === 'r2') {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3');
    const r2 = await getR2Credentials(admin);
    const s3 = new S3Client({
      region: 'auto',
      endpoint: r2.endpoint,
      credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
    });
    const resp = await s3.send(new GetObjectCommand({ Bucket: r2.bucket, Key: storageKey }));
    if (!resp.Body) throw new Error('empty response from R2');
    const chunks: Buffer[] = [];
    for await (const chunk of resp.Body as AsyncIterable<Uint8Array>) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  if (destination === 'vps') {
    const { readFile } = await import('node:fs/promises');
    const dir = process.env.VPS_BACKUP_DIR ?? process.env.LOCAL_BACKUP_DIR ?? '/var/backups/fms';
    return readFile(`${dir}/${storageKey}`);
  }

  throw new Error(`cannot download from destination "${destination}" — upload the file manually`);
}

type RestoreResult = {
  tablesRestored: string[];
  rowsRestored: number;
  skipped: string[];
  errors: string[];
};

// Core restore logic shared by restoreFromRun and restoreFromFile.
async function applyRestore(
  admin: ReturnType<typeof getSupabaseAdmin>,
  bytes: Buffer,
): Promise<RestoreResult> {
  const { gunzipSync } = await import('node:zlib');
  const text = gunzipSync(bytes).toString('utf8');

  // Parse grouped by table name.
  const tableRows = new Map<string, Record<string, unknown>[]>();
  for (const line of text.split('\n')) {
    if (!line.startsWith('{')) continue;
    try {
      const { t, r } = JSON.parse(line) as { t: string; r: Record<string, unknown> };
      if (!tableRows.has(t)) tableRows.set(t, []);
      tableRows.get(t)!.push(r);
    } catch (_) { /* malformed line — skip */ }
  }

  const tablesRestored: string[] = [];
  const skipped: string[] = [];
  const errors: string[] = [];
  let rowsRestored = 0;

  // site_settings: update specific columns only (never delete the singleton).
  if (tableRows.has('site_settings')) {
    const [row] = tableRows.get('site_settings')!;
    if (row) {
      const update: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(row)) {
        if (!SITE_SETTINGS_RESTORE_EXCLUDE.has(k)) update[k] = v;
      }
      if (Object.keys(update).length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (admin.from('site_settings') as any).update(update).eq('id', 1);
        if (error) errors.push(`site_settings: ${error.message}`);
        else { tablesRestored.push('site_settings'); rowsRestored++; }
      }
    }
    tableRows.delete('site_settings');
  }

  // Delete in FK-safe order (children first).
  for (const table of RESTORE_DELETE_ORDER) {
    if (RESTORE_SKIP.has(table)) continue;
    if (!tableRows.has(table)) continue;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from(table as any) as any).delete().gte('id', 0);
    } catch (e) {
      console.warn(`restore: delete failed for ${table}`, e);
    }
  }

  // Insert in FK-safe order (parents first), batched to avoid payload limits.
  const BATCH = 500;
  for (const table of RESTORE_INSERT_ORDER) {
    if (RESTORE_SKIP.has(table)) continue;
    const rows = tableRows.get(table);
    if (!rows || rows.length === 0) continue;

    let ok = true;
    for (let i = 0; i < rows.length; i += BATCH) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (admin.from(table as any) as any).insert(rows.slice(i, i + BATCH));
      if (error) {
        errors.push(`${table}: ${error.message}`);
        ok = false;
        break;
      }
      rowsRestored += Math.min(BATCH, rows.length - i);
    }
    if (ok) tablesRestored.push(table);
  }

  // Track tables present in the backup but not handled above.
  for (const [t] of tableRows) {
    if (!RESTORE_INSERT_ORDER.includes(t) && t !== 'site_settings') {
      if (RESTORE_SKIP.has(t)) skipped.push(t);
    }
  }

  // Reset serial sequences so new rows get correct IDs after the restore.
  try {
    await admin.rpc('reset_public_sequences' as never);
  } catch (e) {
    console.warn('restore: reset_public_sequences failed', e);
  }

  return { tablesRestored, rowsRestored, skipped, errors };
}

// ─── types ───────────────────────────────────────────────────────────────────

type BackupRun = {
  id: number;
  kind: 'scheduled' | 'manual';
  destination: 'r2' | 'supabase' | 'local' | 'vps';
  storage_key: string | null;
  size_bytes: number | null;
  started_at: string;
  finished_at: string | null;
  status: 'running' | 'success' | 'failed';
  error: string | null;
};

type ConfigResult = {
  backup_provider: string;
  backup_keep_n: number;
  backup_cron: string;
  backup_last_run_at: string | null;
  backup_last_status: string | null;
  r2_endpoint?: string | null;
  r2_bucket?: string | null;
  r2_access_key_id?: string | null;
  r2_has_secret?: boolean;
};

type BackupResult = { type: 'success' } | { type: 'download'; data: string; filename: string };

// ─── server fns ──────────────────────────────────────────────────────────────

const listRuns = createServerFn({ method: 'GET' }).handler(async () => {
  await requireUser();
  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('backup_runs') as any)
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  return (data ?? []) as BackupRun[];
});

const loadConfig = createServerFn({ method: 'GET' }).handler(async (): Promise<ConfigResult> => {
  const me = await requireUser();
  const admin = getSupabaseAdmin();
  // select('*') is intentional: if R2 columns from migration 006 don't exist yet
  // the query still succeeds and those fields are simply absent from the result.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.from('site_settings') as any)
    .select('*')
    .eq('id', 1)
    .single();
  if (error) throw new Error(error.message);

  const base: ConfigResult = {
    backup_provider: data.backup_provider ?? 'supabase',
    backup_keep_n: data.backup_keep_n ?? 5,
    backup_cron: data.backup_cron ?? '0 3 * * *',
    backup_last_run_at: data.backup_last_run_at ?? null,
    backup_last_status: data.backup_last_status ?? null,
  };

  if (me.role === 'OWNER') {
    return {
      ...base,
      r2_endpoint: data.r2_endpoint ?? null,
      r2_bucket: data.r2_bucket ?? null,
      r2_access_key_id: data.r2_access_key_id ?? null,
      r2_has_secret: !!data.r2_secret_access_key,
    };
  }
  return base;
});

const ConfigSchema = z.object({
  backup_provider: z.enum(['r2', 'supabase', 'local', 'vps']),
  backup_keep_n: z.coerce.number().int().min(1).max(50),
  backup_cron: z.string().min(9),
  r2_endpoint: z.string().optional(),
  r2_bucket: z.string().optional(),
  r2_access_key_id: z.string().optional(),
  r2_secret_access_key: z.string().optional(),
});

const saveConfig = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => ConfigSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('only OWNER may change backup config');

    const admin = getSupabaseAdmin();
    const update: Record<string, unknown> = {
      backup_provider: data.backup_provider,
      backup_keep_n: data.backup_keep_n,
      backup_cron: data.backup_cron,
    };
    // Only touch R2 columns when provider is R2 — avoids errors if migration 006
    // has not been applied yet, and avoids wiping saved credentials on provider switch.
    if (data.backup_provider === 'r2') {
      update.r2_endpoint = data.r2_endpoint || null;
      update.r2_bucket = data.r2_bucket || 'fms-backups';
      update.r2_access_key_id = data.r2_access_key_id || null;
      if (data.r2_secret_access_key) {
        update.r2_secret_access_key = data.r2_secret_access_key;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (admin.from('site_settings') as any).update(update).eq('id', 1);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const runBackupNow = createServerFn({ method: 'POST' }).handler(async (): Promise<BackupResult> => {
  const me = await requireUser();
  const sb = getSupabaseServer();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ok } = await (sb.rpc as any)('has_permission', { p_resource: 'backups', p_action: 'run' });
  if (!ok) throw new Error('forbidden');

  const admin = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: settings } = await (admin.from('site_settings') as any)
    .select('backup_provider, backup_keep_n')
    .eq('id', 1)
    .single();

  const destination = (settings?.backup_provider ?? 'supabase') as BackupRun['destination'];
  const keepN: number = settings?.backup_keep_n ?? 5;

  // Open a run record (non-fatal if this fails).
  let runId: number | null = null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run } = await (admin.from('backup_runs') as any)
      .insert({ kind: 'manual', destination })
      .select('id')
      .single();
    runId = run?.id ?? null;
  } catch (_) { /* continue without a run record */ }

  const markDone = async (status: 'success' | 'failed', extra: Record<string, unknown> = {}) => {
    if (runId !== null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.from('backup_runs') as any)
        .update({ status, finished_at: new Date().toISOString(), ...extra })
        .eq('id', runId);
    }
    const settingsUpdate: Record<string, unknown> = {
      backup_last_status: status === 'success' ? 'success' : `failed: ${String(extra.error ?? 'unknown error')}`,
    };
    if (status === 'success') settingsUpdate.backup_last_run_at = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (admin.from('site_settings') as any).update(settingsUpdate).eq('id', 1);
  };

  try {
    const { bytes, filename } = await generateDump(admin);

    if (destination === 'local') {
      await markDone('success', { size_bytes: bytes.length });
      return { type: 'download', data: bytes.toString('base64'), filename };
    }

    let storageKey: string | null = null;

    if (destination === 'r2') {
      const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
      const r2 = await getR2Credentials(admin);
      if (!r2.endpoint || !r2.accessKeyId || !r2.secretAccessKey) {
        throw new Error('R2 credentials not configured — enter them in the backup settings.');
      }
      const s3 = new S3Client({
        region: 'auto',
        endpoint: r2.endpoint,
        credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
      });
      await s3.send(
        new PutObjectCommand({ Bucket: r2.bucket, Key: filename, Body: bytes, ContentType: 'application/gzip' }),
      );
      storageKey = filename;
    } else if (destination === 'supabase') {
      const { error: upErr } = await admin.storage
        .from('backups')
        .upload(filename, bytes, { contentType: 'application/gzip' });
      if (upErr) throw upErr;
      storageKey = filename;
    } else if (destination === 'vps') {
      const { writeFile, mkdir } = await import('node:fs/promises');
      const dir = process.env.VPS_BACKUP_DIR ?? process.env.LOCAL_BACKUP_DIR ?? '/var/backups/fms';
      await mkdir(dir, { recursive: true });
      await writeFile(`${dir}/${filename}`, bytes);
      storageKey = filename;
    }

    await markDone('success', { storage_key: storageKey, size_bytes: bytes.length });
    await rotateBackups(admin, destination, keepN);
    return { type: 'success' };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await markDone('failed', { error: msg });
    throw new Error(msg);
  }
});

// Restore from a previously stored backup run (r2, supabase, or vps).
const restoreFromRun = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ runId: z.number() }).parse(d))
  .handler(async ({ data }): Promise<RestoreResult> => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('only OWNER may restore backups');

    const admin = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: run, error: runErr } = await (admin.from('backup_runs') as any)
      .select('destination, storage_key')
      .eq('id', data.runId)
      .single();
    if (runErr || !run) throw new Error('backup run not found');
    if (!run.storage_key) throw new Error('this backup has no stored file — upload a local file instead');

    const bytes = await downloadBackupBytes(admin, run.destination, run.storage_key);
    return applyRestore(admin, bytes);
  });

// Restore from a file the user uploads (base64-encoded gzip).
const restoreFromFile = createServerFn({ method: 'POST' })
  .inputValidator((d: unknown) => z.object({ data: z.string(), filename: z.string() }).parse(d))
  .handler(async ({ data }): Promise<RestoreResult> => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('only OWNER may restore backups');

    const admin = getSupabaseAdmin();
    const bytes = Buffer.from(data.data, 'base64');
    return applyRestore(admin, bytes);
  });

const downloadKey = createServerFn({ method: 'GET' })
  .inputValidator((d: unknown) => z.object({ key: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const me = await requireUser();
    if (me.role !== 'OWNER') throw new Error('forbidden');
    const admin = getSupabaseAdmin();
    const { data: blob, error } = await admin.storage.from('backups').createSignedUrl(data.key, 60);
    if (error || !blob) throw new Error(error?.message ?? 'sign failed');
    return { url: blob.signedUrl };
  });

// ─── route ───────────────────────────────────────────────────────────────────

export const Route = createFileRoute('/app/settings/backups')({
  beforeLoad: async () => {
    const me = await requireUser();
    if (!['OWNER', 'ADMIN'].includes(me.role)) throw redirect({ to: '/app/dashboard' });
    return { me };
  },
  component: BackupsTab,
});

// ─── UI helpers ──────────────────────────────────────────────────────────────

function triggerBrowserDownload(base64: string, filename: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: 'application/gzip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:application/gzip;base64,<data> → strip prefix
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

const DESTINATION_LABEL: Record<string, string> = {
  r2: 'Cloudflare R2',
  supabase: 'Storage',
  local: 'Downloaded',
  vps: 'VPS disk',
};

// ─── components ──────────────────────────────────────────────────────────────

function BackupsTab() {
  const { me } = Route.useRouteContext();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [confirmRun, setConfirmRun] = useState<{ runId: number; label: string } | null>(null);
  const [confirmFile, setConfirmFile] = useState<{ data: string; filename: string } | null>(null);

  const runs = useQuery({ queryKey: ['backup-runs'], queryFn: listRuns, refetchInterval: 10_000 });
  const config = useQuery({ queryKey: ['backup-config'], queryFn: loadConfig });

  // ── backup ──
  const triggerBackup = useMutation({
    mutationFn: () => runBackupNow(),
    onSuccess: (result) => {
      if (result.type === 'download') {
        triggerBrowserDownload(result.data, result.filename);
        toast.success('Backup downloaded to your computer');
      } else {
        toast.success('Backup completed successfully');
      }
      qc.invalidateQueries({ queryKey: ['backup-runs'] });
      qc.invalidateQueries({ queryKey: ['backup-config'] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Backup failed'),
  });

  // ── restore from history row ──
  const restoreRun = useMutation({
    mutationFn: (runId: number) => restoreFromRun({ data: { runId } }),
    onSuccess: (result) => {
      setConfirmRun(null);
      const msg = `Restored ${result.rowsRestored} rows across ${result.tablesRestored.length} tables`;
      if (result.errors.length) {
        toast.warning(`${msg} (with ${result.errors.length} error(s) — check console)`);
        console.error('Restore errors:', result.errors);
      } else {
        toast.success(msg);
      }
      qc.invalidateQueries({ queryKey: ['backup-runs'] });
      qc.invalidateQueries({ queryKey: ['backup-config'] });
    },
    onError: (e) => {
      setConfirmRun(null);
      toast.error(e instanceof Error ? e.message : 'Restore failed');
    },
  });

  // ── restore from uploaded file ──
  const restoreFile = useMutation({
    mutationFn: (payload: { data: string; filename: string }) =>
      restoreFromFile({ data: payload }),
    onSuccess: (result) => {
      setConfirmFile(null);
      const msg = `Restored ${result.rowsRestored} rows across ${result.tablesRestored.length} tables`;
      if (result.errors.length) {
        toast.warning(`${msg} (with ${result.errors.length} error(s) — check console)`);
        console.error('Restore errors:', result.errors);
      } else {
        toast.success(msg);
      }
      qc.invalidateQueries({ queryKey: ['backup-runs'] });
      qc.invalidateQueries({ queryKey: ['backup-config'] });
    },
    onError: (e) => {
      setConfirmFile(null);
      toast.error(e instanceof Error ? e.message : 'Restore from file failed');
    },
  });

  const isRestoring = restoreRun.isPending || restoreFile.isPending;

  const lastRun = config.data?.backup_last_run_at
    ? new Date(config.data.backup_last_run_at).toLocaleString()
    : null;
  const lastStatus = config.data?.backup_last_status ?? null;
  const isSuccess = lastStatus === 'success';

  return (
    <div className="space-y-6">
      {/* ── Status + trigger ── */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="space-y-1">
            <p className="text-base font-medium">
              {lastRun ? `Last backup: ${lastRun}` : 'No backups have been run yet'}
            </p>
            {lastStatus && (
              <p className={`text-sm ${isSuccess ? 'text-green-600' : 'text-destructive'}`}>
                {isSuccess ? 'Completed successfully' : lastStatus}
              </p>
            )}
            {config.data && (
              <p className="text-sm text-muted-foreground">
                Saves to:{' '}
                <strong>{DESTINATION_LABEL[config.data.backup_provider] ?? config.data.backup_provider}</strong>
              </p>
            )}
          </div>
          <Button
            onClick={() => triggerBackup.mutate()}
            disabled={triggerBackup.isPending || isRestoring}
            size="lg"
          >
            {triggerBackup.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PlayCircle className="h-4 w-4" />
            )}
            {triggerBackup.isPending ? 'Saving backup…' : 'Save backup now'}
          </Button>
        </CardContent>
      </Card>

      {/* ── Config — OWNER only ── */}
      {me.role === 'OWNER' && (
        config.isPending ? (
          <Card>
            <CardHeader><CardTitle>Backup settings</CardTitle></CardHeader>
            <CardContent className="space-y-4 pb-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
          </Card>
        ) : config.data ? (
          <ConfigCard config={config.data} />
        ) : (
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">Failed to load backup settings — check the database connection.</p>
            </CardContent>
          </Card>
        )
      )}

      {/* ── Restore from file — OWNER only ── */}
      {me.role === 'OWNER' && (
        <Card>
          <CardHeader>
            <CardTitle>Restore from file</CardTitle>
            <CardDescription>
              Upload a previously downloaded backup file (.ndjson.gz) to restore all data.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <input
              ref={fileRef}
              type="file"
              accept=".gz,.ndjson.gz"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                try {
                  const data = await readFileAsBase64(file);
                  setConfirmFile({ data, filename: file.name });
                } catch {
                  toast.error('Could not read the file');
                }
                // Reset so the same file can be re-selected
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={isRestoring || triggerBackup.isPending}
            >
              <Upload className="h-4 w-4" />
              Choose backup file…
            </Button>
            {restoreFile.isPending && (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Restoring data…
              </span>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── History ── */}
      <Card>
        <CardHeader>
          <CardTitle>Backup history</CardTitle>
          <CardDescription>Last 50 backup runs</CardDescription>
        </CardHeader>
        <CardContent>
          {runs.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !runs.data?.length ? (
            <p className="text-sm text-muted-foreground">No backups yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="text-start p-2">Date & time</th>
                  <th className="text-start p-2">Type</th>
                  <th className="text-start p-2">Saved to</th>
                  <th className="text-start p-2">Size</th>
                  <th className="text-start p-2">Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {runs.data.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{new Date(r.started_at).toLocaleString()}</td>
                    <td className="p-2">
                      <Badge variant={r.kind === 'scheduled' ? 'secondary' : 'outline'}>
                        {r.kind === 'scheduled' ? 'Automatic' : 'Manual'}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3 shrink-0" />
                        {DESTINATION_LABEL[r.destination] ?? r.destination}
                      </span>
                    </td>
                    <td className="p-2">
                      {r.size_bytes ? `${(r.size_bytes / 1024 / 1024).toFixed(1)} MB` : '—'}
                    </td>
                    <td className="p-2">
                      {r.status === 'success' ? (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="h-3 w-3" /> Done
                        </span>
                      ) : r.status === 'failed' ? (
                        <span
                          className="flex items-center gap-1 text-destructive"
                          title={r.error ?? undefined}
                        >
                          <XCircle className="h-3 w-3" /> Failed
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" /> Running
                        </span>
                      )}
                    </td>
                    <td className="p-2">
                      <div className="flex items-center justify-end gap-1">
                        {/* Download — Supabase Storage only */}
                        {r.storage_key && r.destination === 'supabase' && me.role === 'OWNER' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Download backup file"
                            onClick={async () => {
                              try {
                                const { url } = await downloadKey({ data: { key: r.storage_key! } });
                                window.location.href = url;
                              } catch (e) {
                                toast.error(e instanceof Error ? e.message : 'Download failed');
                              }
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        {/* Restore — OWNER only, successful runs with a stored file */}
                        {me.role === 'OWNER' &&
                          r.status === 'success' &&
                          r.storage_key &&
                          r.destination !== 'local' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Restore from this backup"
                              disabled={isRestoring || triggerBackup.isPending}
                              onClick={() =>
                                setConfirmRun({
                                  runId: r.id,
                                  label: new Date(r.started_at).toLocaleString(),
                                })
                              }
                            >
                              {restoreRun.isPending && confirmRun?.runId === r.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RotateCcw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── Restore-from-run confirmation ── */}
      <AlertDialog open={!!confirmRun} onOpenChange={(o) => { if (!o) setConfirmRun(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from backup?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>overwrite all current data</strong> with the snapshot from{' '}
              <strong>{confirmRun?.label}</strong>. The action cannot be undone.
              <br /><br />
              User accounts are not affected. Backup settings and credentials are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreRun.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreRun.isPending}
              onClick={() => confirmRun && restoreRun.mutate(confirmRun.runId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoreRun.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</>
              ) : (
                'Yes, restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Restore-from-file confirmation ── */}
      <AlertDialog open={!!confirmFile} onOpenChange={(o) => { if (!o) setConfirmFile(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore from uploaded file?</AlertDialogTitle>
            <AlertDialogDescription>
              This will <strong>overwrite all current data</strong> with the contents of{' '}
              <strong>{confirmFile?.filename}</strong>. The action cannot be undone.
              <br /><br />
              User accounts are not affected. Backup settings and credentials are preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreFile.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={restoreFile.isPending}
              onClick={() => confirmFile && restoreFile.mutate(confirmFile)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {restoreFile.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Restoring…</>
              ) : (
                'Yes, restore'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ConfigCard({ config }: { config: ConfigResult }) {
  const qc = useQueryClient();

  const initialPreset =
    SCHEDULE_PRESETS.find((p) => p.value !== 'custom' && p.value === config.backup_cron)?.value ??
    'custom';

  // Local state drives the conditional sections — more reliable than form.Subscribe
  // for showing/hiding fields based on sibling field values.
  const [provider, setProvider] = useState(
    (config.backup_provider ?? 'supabase') as 'r2' | 'supabase' | 'local' | 'vps',
  );
  const [schedulePreset, setSchedulePreset] = useState(initialPreset);

  const form = useForm({
    defaultValues: {
      backup_provider: (config.backup_provider ?? 'supabase') as 'r2' | 'supabase' | 'local' | 'vps',
      backup_keep_n: config.backup_keep_n ?? 5,
      backup_cron: config.backup_cron ?? '0 3 * * *',
      r2_endpoint: config.r2_endpoint ?? '',
      r2_bucket: config.r2_bucket ?? 'fms-backups',
      r2_access_key_id: config.r2_access_key_id ?? '',
      r2_secret_access_key: '',
    },
    onSubmit: async ({ value }) => {
      try {
        await saveConfig({
          data: {
            backup_provider: value.backup_provider,
            backup_keep_n: value.backup_keep_n,
            backup_cron: value.backup_cron,
            r2_endpoint: value.r2_endpoint || undefined,
            r2_bucket: value.r2_bucket || undefined,
            r2_access_key_id: value.r2_access_key_id || undefined,
            r2_secret_access_key: value.r2_secret_access_key || undefined,
          },
        });
        toast.success('Settings saved');
        qc.invalidateQueries({ queryKey: ['backup-config'] });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Save failed');
      }
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Backup settings</CardTitle>
        <CardDescription>Only the account owner can change these settings.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            form.handleSubmit();
          }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            {/* Where to save */}
            <form.Field name="backup_provider">
              {(f) => (
                <div className="grid gap-1.5">
                  <Label>Where to save backups</Label>
                  <Select
                    value={f.state.value}
                    onValueChange={(v) => {
                      f.handleChange(v as typeof f.state.value);
                      setProvider(v as typeof provider);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="r2">Cloudflare R2 (recommended for production)</SelectItem>
                      <SelectItem value="supabase">Supabase Storage (on this server)</SelectItem>
                      <SelectItem value="local">Download to my computer (manual only)</SelectItem>
                      <SelectItem value="vps">Save on server disk (manual only)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form.Field>

            {/* Keep N */}
            <form.Field name="backup_keep_n">
              {(f) => (
                <div className="grid gap-1.5">
                  <Label>Keep the last</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={50}
                      value={f.state.value}
                      onChange={(e) => f.handleChange(Number(e.target.value))}
                      className="w-20"
                    />
                    <span className="text-sm text-muted-foreground">
                      backups (older ones deleted automatically)
                    </span>
                  </div>
                </div>
              )}
            </form.Field>

            {/* Schedule */}
            <div className="grid gap-1.5">
              <Label>How often to back up automatically</Label>
              <Select
                value={schedulePreset}
                onValueChange={(v) => {
                  setSchedulePreset(v);
                  if (v !== 'custom') form.setFieldValue('backup_cron', v);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCHEDULE_PRESETS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Custom cron expression — only when 'custom' is selected */}
            {schedulePreset === 'custom' && (
              <form.Field name="backup_cron">
                {(f) => (
                  <div className="grid gap-1.5">
                    <Label>Custom schedule (cron, UTC)</Label>
                    <Input
                      value={f.state.value}
                      onChange={(e) => f.handleChange(e.target.value)}
                      placeholder="0 3 * * *"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format: minute hour day month weekday
                    </p>
                  </div>
                )}
              </form.Field>
            )}
          </div>

          {/* R2 credentials — only when Cloudflare R2 is selected */}
          {provider === 'r2' && (
            <div className="rounded-lg border p-4 space-y-4">
              <div>
                <p className="font-medium text-sm">Cloudflare R2 credentials</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Create an R2 bucket in your Cloudflare dashboard, then paste the access details here.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <form.Field name="r2_endpoint">
                  {(f) => (
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label>Endpoint URL</Label>
                      <Input
                        value={f.state.value}
                        onChange={(e) => f.handleChange(e.target.value)}
                        placeholder="https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com"
                        className="font-mono text-xs"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="r2_bucket">
                  {(f) => (
                    <div className="grid gap-1.5">
                      <Label>Bucket name</Label>
                      <Input
                        value={f.state.value}
                        onChange={(e) => f.handleChange(e.target.value)}
                        placeholder="fms-backups"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="r2_access_key_id">
                  {(f) => (
                    <div className="grid gap-1.5">
                      <Label>Access Key ID</Label>
                      <Input
                        value={f.state.value}
                        onChange={(e) => f.handleChange(e.target.value)}
                        placeholder="Access Key ID"
                        className="font-mono text-xs"
                      />
                    </div>
                  )}
                </form.Field>
                <form.Field name="r2_secret_access_key">
                  {(f) => (
                    <div className="grid gap-1.5 sm:col-span-2">
                      <Label>Secret Access Key</Label>
                      <Input
                        type="password"
                        value={f.state.value}
                        onChange={(e) => f.handleChange(e.target.value)}
                        placeholder={
                          config.r2_has_secret
                            ? '•••••••••••••••• (leave blank to keep existing)'
                            : 'Secret Access Key'
                        }
                        className="font-mono text-xs"
                      />
                    </div>
                  )}
                </form.Field>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" disabled={form.state.isSubmitting}>
              {form.state.isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Save settings
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
