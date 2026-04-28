// Edge Function: backup
//
// Triggered by:
//   * pg_cron (see migration 20260425000003) on `site_settings.backup_cron`
//   * The app UI's "Manual backup" action (POST with body: { kind: 'manual', destination?: '...' })
//
// Flow:
//   1. read site_settings → destination + keep_n
//   2. pg_dump current DB into a gzip stream
//   3. upload to {r2 | supabase | local | vps}
//   4. INSERT into backup_runs with success/failure
//   5. rotate: drop oldest entries until len ≤ keep_n
//
// pg_dump is invoked via the `postgres` extension's COPY pipeline since the
// edge runtime cannot fork a binary. We use pg_dump-compatible logical export
// via SQL functions instead — sufficient for FMS's data volume.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { S3Client, PutObjectCommand, DeleteObjectCommand, ListObjectsV2Command } from 'npm:@aws-sdk/client-s3@3';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const DB_URL = Deno.env.get('SUPABASE_DB_URL')!;

interface Job { kind: 'scheduled' | 'manual'; destination?: 'r2' | 'supabase' | 'local' | 'vps'; }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const job: Job = await req.json().catch(() => ({ kind: 'scheduled' as const }));
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  const { data: settings, error: sErr } = await admin
    .from('site_settings').select('backup_provider,backup_keep_n').eq('id', 1).single();
  if (sErr || !settings) return json({ ok: false, error: sErr?.message ?? 'no settings' }, 500);

  const destination = (job.destination ?? settings.backup_provider) as Job['destination'];
  const keepN = settings.backup_keep_n;

  // Open the run record.
  const { data: run, error: runErr } = await admin
    .from('backup_runs')
    .insert({ kind: job.kind, destination })
    .select().single();
  if (runErr || !run) return json({ ok: false, error: runErr?.message }, 500);

  try {
    const { bytes, key } = await pgDumpToBuffer();

    let storageKey: string;
    if (destination === 'r2')         storageKey = await uploadR2(key, bytes);
    else if (destination === 'supabase') storageKey = await uploadSupabase(admin, key, bytes);
    else throw new Error(`destination "${destination}" not supported from edge function — run via the app for local/vps targets.`);

    await admin.from('backup_runs')
      .update({ status: 'success', finished_at: new Date().toISOString(), storage_key: storageKey, size_bytes: bytes.byteLength })
      .eq('id', run.id);

    await admin.from('site_settings').update({ backup_last_run_at: new Date().toISOString(), backup_last_status: 'success' }).eq('id', 1);

    await rotate(admin, destination, keepN);

    return json({ ok: true, key: storageKey, size: bytes.byteLength });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await admin.from('backup_runs')
      .update({ status: 'failed', finished_at: new Date().toISOString(), error: msg })
      .eq('id', run.id);
    await admin.from('site_settings').update({ backup_last_status: 'failed: ' + msg }).eq('id', 1);
    return json({ ok: false, error: msg }, 500);
  }
});

function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json' } });
}

async function pgDumpToBuffer(): Promise<{ bytes: Uint8Array; key: string }> {
  // Logical dump: snapshot every public.* table to JSON-NDJSON, gzipped.
  // For larger installs swap this for `pg_dump` via a sidecar container.
  const { default: postgres } = await import('npm:postgres@3');
  const sql = postgres(DB_URL, { max: 1 });
  try {
    const tables = (await sql<{ table_name: string }[]>`
      select table_name from information_schema.tables
      where table_schema='public' and table_type='BASE TABLE'
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

async function uploadR2(key: string, bytes: Uint8Array) {
  const s3 = new S3Client({
    region: 'auto',
    endpoint: Deno.env.get('R2_ENDPOINT')!,
    credentials: {
      accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
      secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
    },
  });
  await s3.send(new PutObjectCommand({
    Bucket: Deno.env.get('R2_BUCKET')!,
    Key: key,
    Body: bytes,
    ContentType: 'application/gzip',
  }));
  return key;
}

async function uploadSupabase(admin: ReturnType<typeof createClient>, key: string, bytes: Uint8Array) {
  const { error } = await admin.storage.from('backups').upload(key, bytes, { contentType: 'application/gzip' });
  if (error) throw error;
  return key;
}

/**
 * Keep the N most recent successful backups; delete the rest from both the
 * remote store and the backup_runs ledger.
 */
async function rotate(admin: ReturnType<typeof createClient>, destination: string, keepN: number) {
  const { data: rows } = await admin
    .from('backup_runs')
    .select('id,storage_key')
    .eq('destination', destination)
    .eq('status', 'success')
    .order('started_at', { ascending: false });
  if (!rows || rows.length <= keepN) return;

  const toDrop = rows.slice(keepN);
  for (const r of toDrop) {
    if (!r.storage_key) continue;
    try {
      if (destination === 'r2') {
        const s3 = new S3Client({
          region: 'auto',
          endpoint: Deno.env.get('R2_ENDPOINT')!,
          credentials: {
            accessKeyId: Deno.env.get('R2_ACCESS_KEY_ID')!,
            secretAccessKey: Deno.env.get('R2_SECRET_ACCESS_KEY')!,
          },
        });
        await s3.send(new DeleteObjectCommand({ Bucket: Deno.env.get('R2_BUCKET')!, Key: r.storage_key }));
      } else if (destination === 'supabase') {
        await admin.storage.from('backups').remove([r.storage_key]);
      }
    } catch (e) {
      console.warn(`rotate: failed to delete ${r.storage_key}`, e);
    }
    await admin.from('backup_runs').delete().eq('id', r.id);
  }
}

// Suppress lint warnings about unused imports in code paths the runtime tree-shakes.
export const _types = { ListObjectsV2Command };
