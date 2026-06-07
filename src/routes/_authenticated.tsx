import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { ensureUserSetup } from "@/lib/server-functions";
import { currentUserQueryOptions } from "@/lib/query-options";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/login" });
    return { user: data.user };
  },
  component: AuthedShell,
});

function AuthedShell() {
  const qc = useQueryClient();
  const setup = useServerFn(ensureUserSetup);
  useEffect(() => {
    setup()
      .then(() => qc.invalidateQueries({ queryKey: ["current-user"] }))
      .catch(() => {});
    qc.prefetchQuery(currentUserQueryOptions());
  }, [setup, qc]);
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}
