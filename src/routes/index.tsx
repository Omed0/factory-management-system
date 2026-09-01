import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { checkAuth } from "~/lib/auth";


export const Route = createFileRoute("/")({
  beforeLoad: async ({ context }) => {
    if (!context.settings?.setup_completed) {
      throw redirect({ to: "/setup" });
    }
    const { authenticated } = await checkAuth();
    throw redirect({ to: authenticated ? "/app/dashboard" : "/login" });
  },
});
