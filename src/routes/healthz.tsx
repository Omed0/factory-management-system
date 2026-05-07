import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";

const extractClientIp = (request: Request): string | null => {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0]?.trim() ?? null;
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("cf-connecting-ip") ??
    null
  );
};

const isInternalIp = (rawIp: string): boolean => {
  const cleaned = rawIp
    .trim()
    .replace(/^\[|\]$/g, "")
    .replace(/^::ffff:/i, "")
    .toLowerCase();

  if (cleaned === "::1" || cleaned === "localhost") return true;
  if (
    cleaned.startsWith("fe80:") ||
    cleaned.startsWith("fc") ||
    cleaned.startsWith("fd")
  )
    return true;

  const ip = (cleaned.split(":")[0] ?? "").toLowerCase();
  if (!ip || ip.includes(":")) return false;

  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (
      parts.length !== 4 ||
      parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)
    ) {
      return false;
    }
    const [a, b] = parts as [number, number, number, number];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 192 && b === 168) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 169 && b === 254) return true;
  }

  return false;
};

// createServerFn handlers run server-side only — safe to import supabase.server here.
const _dbPing = createServerFn({ method: "GET" }).handler(async () => {
  const { getSupabaseAdmin } = await import("~/lib/supabase.server");
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("site_settings").select("id").limit(1);
  if (error) throw new Error(error.message);
  return { ok: true as const, ts: Date.now() };
});

/**
 * Liveness + readiness probe.
 *   200 → process is up and Postgres is reachable
 *   503 → DB unreachable (used by Caddy / Docker healthcheck / VPS cron)
 */
export const Route = createFileRoute("/healthz")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const clientIp = extractClientIp(request);
        if (!clientIp || !isInternalIp(clientIp)) {
          return new Response(
            JSON.stringify({ ok: false, error: "forbidden" }),
            {
              status: 403,
              headers: {
                "content-type": "application/json",
                "cache-control": "no-store",
              },
            },
          );
        }

        try {
          const result = await _dbPing();
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: {
              "content-type": "application/json",
              "cache-control": "no-store",
            },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({
              ok: false,
              error: e instanceof Error ? e.message : "unknown",
            }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
