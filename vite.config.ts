import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [tanstackStart(), tsconfigPaths(), react(), tailwindcss()],
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
});
