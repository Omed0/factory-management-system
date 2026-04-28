import { createFileRoute } from "@tanstack/react-router";
import { getSupabaseAdmin } from "~/lib/supabase.server";

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
  const cleaned = rawIp.trim().replace(/^\[|\]$/g, "").replace(/^::ffff:/i, "").toLowerCase();

  // Pure IPv6 loopback and link-local — must be checked BEFORE splitting on ":"
  // because split(":")[0] on "::1" yields "" and on "fe80::1" yields "fe80".
  if (cleaned === "::1" || cleaned === "localhost") return true;
  if (cleaned.startsWith("fe80:") || cleaned.startsWith("fc") || cleaned.startsWith("fd")) return true;

  // Isolate the IPv4 address (handles "::ffff:"-stripped form or plain IPv4).
  const ip = (cleaned.split(":")[0] ?? "").toLowerCase();
  if (!ip || ip.includes(":")) return false;

  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
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
          return new Response(JSON.stringify({ ok: false, error: "forbidden" }), {
            status: 403,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        }

        try {
          const sb = getSupabaseAdmin()
          const { error } = await sb.from("site_settings").select("id").limit(1);
          if (error) throw error;
          return new Response(JSON.stringify({ ok: true, ts: Date.now() }), {
            status: 200,
            headers: { "content-type": "application/json", "cache-control": "no-store" },
          });
        } catch (e) {
          return new Response(
            JSON.stringify({ ok: false, error: e instanceof Error ? e.message : "unknown" }),
            { status: 503, headers: { "content-type": "application/json" } },
          );
        }
      },
    },
  },
});
