// Edge Function: backup
//
// Triggered by pg_cron on the schedule stored in site_settings.backup_cron.
// Manual backups are now executed directly in the app's server function
// (src/routes/app/settings/backups.tsx → runBackupNow) instead of calling
// this endpoint, so this function only handles scheduled runs.
//
// Flow:
//   1. read site_settings → destination, keep_n, R2 credentials
//   2. logical export of every public.* table → NDJSON, gzip
//   3. upload to {r2 | supabase}
//   4. INSERT into backup_runs with success/failure
//   5. rotate: drop oldest entries until count ≤ keep_n

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from 'npm:@aws-sdk/client-s3@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_URL = Deno.env.get('SUPABASE_DB_URL')!;

interface Job { kind: 'scheduled' | 'manual'; destination?: 'r2' | 'supabase' | 'local' | 'vps'; }

interface R2Creds { endpoint: string; bucket: string; accessKeyId: string; secretAccessKey: string; }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const job: Job = await req.json().catch(() => ({ kind: 'scheduled' as const }));
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: settings, error: sErr } = await admin
    .from('site_settings')
    .select('backup_provider, backup_keep_n, r2_endpoint, r2_bucket, r2_access_key_id, r2_secret_access_key')
    .eq('id', 1)
    .single();
  if (sErr || !settings) return json({ ok: false, error: sErr?.message ?? 'no settings' }, 500);

  const destination = (job.destination ?? settings.backup_provider) as Job['destination'];
  const keepN: number = settings.backup_keep_n;

  const { data: run, error: runErr } = await admin
    .from('backup_runs')
    .insert({ kind: job.kind, destination })
    .select()
    .single();
  if (runErr || !run) return json({ ok: false, error: runErr?.message }, 500);

  try {
    const { bytes, key } = await pgDumpToBuffer();

    let storageKey: string;
    if (destination === 'r2') {
      const r2 = resolveR2Creds(settings);
      storageKey = await uploadR2(key, bytes, r2);
    } else if (destination === 'supabase') {
      storageKey = await uploadSupabase(admin, key, bytes);
    } else {
      throw new Error(
        `destination "${destination}" is not supported from the edge function — use the app UI for local/vps targets.`,
      );
    }

    await admin.from('backup_runs').update({
      status: 'success',
      finished_at: new Date().toISOString(),
      storage_key: storageKey,
      size_bytes: bytes.byteLength,
    }).eq('id', run.id);

    await admin.from('site_settings').update({
      backup_last_run_at: new Date().toISOString(),
      backup_last_status: 'success',
    }).eq('id', 1);

    await rotate(admin, destination, keepN, settings);

    return json({ ok: true, key: storageKey, size: bytes.byteLength });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from('backup_runs').update({
      status: 'failed',
      finished_at: new Date().toISOString(),
      error: msg,
    }).eq('id', run.id);
    await admin.from('site_settings').update({ backup_last_status: `failed: ${msg}` }).eq('id', 1);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}

// Read R2 credentials from site_settings DB columns first, fall back to env vars.
function resolveR2Creds(settings: Record<string, unknown>): R2Creds {
  return {
    endpoint: String(settings.r2_endpoint || Deno.env.get('R2_ENDPOINT') || ''),
    bucket: String(settings.r2_bucket || Deno.env.get('R2_BUCKET') || 'fms-backups'),
    accessKeyId: String(settings.r2_access_key_id || Deno.env.get('R2_ACCESS_KEY_ID') || ''),
    secretAccessKey: String(settings.r2_secret_access_key || Deno.env.get('R2_SECRET_ACCESS_KEY') || ''),
  };
}

async function pgDumpToBuffer(): Promise<{ bytes: Uint8Array; key: string }> {
  const { default: postgres } = await import('npm:postgres@3');
  const sql = postgres(DB_URL, { max: 1 });
  try {
    const tables = (await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema = 'public' and table_type = 'BASE TABLE'
      order by table_name
    `).map((r) => r.table_name);

    const lines: string[] = [`-- FMS backup ${new Date().toISOString()}`];
    for (const t of tables) {
      const rows = await sql.unsafe(`select * from public."${t}"`);
      lines.push(`-- TABLE ${t} (${rows.length} rows)`);
      for (const r of rows) lines.push(JSON.stringify({ t, r }));
    }

    const text = lines.join('\n');
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    const bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    const key = `fms-${new Date().toISOString().replace(/[:.]/g, '-')}.ndjson.gz`;
    return { bytes, key };
  } finally {
    await sql.end({ timeout: 1 });
  }
}

async function uploadR2(key: string, bytes: Uint8Array, r2: R2Creds): Promise<string> {
  if (!r2.endpoint || !r2.accessKeyId || !r2.secretAccessKey) {
    throw new Error('R2 credentials not configured — set them in the backup settings UI.');
  }
  const s3 = new S3Client({
    region: 'auto',
    endpoint: r2.endpoint,
    credentials: { accessKeyId: r2.accessKeyId, secretAccessKey: r2.secretAccessKey },
  });
  await s3.send(new PutObjectCommand({
    Bucket: r2.bucket,
    Key: key,
    Body: bytes,
    ContentType: 'application/gzip',
  }));
  return key;
}

async function uploadSupabase(admin: ReturnType<typeof createClient>, key: string, bytes: Uint8Array): Promise<string> {
  const { error } = await admin.storage.from('backups').upload(key, bytes, { contentType: 'application/gzip' });
  if (error) throw error;
  return key;
}

async function rotate(
  admin: ReturnType<typeof createClient>,
  destination: string,
  keepN: number,
  settings: Record<string, unknown>,
) {
  const { data: rows } = await admin
    .from('backup_runs')
    .select('id, storage_key')
    .eq('destination', destination)
    .eq('status', 'success')
    .order('started_at', { ascending: false });

  if (!rows || rows.length <= keepN) return;

  const r2 = resolveR2Creds(settings);
  for (const r of rows.slice(keepN)) {
    if (r.storage_key) {
      try {
        if (destination === 'r2') {
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
    await admin.from('backup_runs').delete().eq('id', r.id);
  }
}
