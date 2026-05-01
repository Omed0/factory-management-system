import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

const deployTarget = process.env.DEPLOY_TARGET ?? "node";

export default defineConfig(async () => {
  // For Cloudflare Workers, the @cloudflare/vite-plugin must be loaded BEFORE
  // tanstackStart so it can intercept the SSR environment and produce a
  // CF-compatible worker bundle instead of a Node.js server bundle.
  const cloudflarePlugins = [];
  if (deployTarget === "cloudflare") {
    const { cloudflare } = await import("@cloudflare/vite-plugin");
    cloudflarePlugins.push(cloudflare({ viteEnvironment: { name: "ssr" } }));
  }

  return {
    plugins: [
      ...cloudflarePlugins,
      tanstackStart(),
      tsconfigPaths(),
      react(),
      tailwindcss(),
    ],
    server: {
      host: true,
      port: 3000,
      strictPort: true,
      watch: {
        // Exclude Supabase Docker volumes — Postgres WAL, storage, and logs
        // change constantly and would otherwise trigger a full page reload.
        ignored: [
          path.resolve(__dirname, "supabase/volumes/**"),
          path.resolve(__dirname, "supabase/docker/**"),
          "**/.git/**",
        ],
      },
    },
  };
});
