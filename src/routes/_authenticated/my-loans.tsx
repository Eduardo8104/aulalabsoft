import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { myLoansQueryOptions } from "@/lib/query-options";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/my-loans")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myLoansQueryOptions()),
  component: MyLoansPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  active: "Ativo",
  returned: "Devolvido",
  rejected: "Rejeitado",
  overdue: "Vencido",
};

function MyLoansPage() {
  const { data } = useSuspenseQuery(myLoansQueryOptions());
  const qc = useQueryClient();

  useEffect(() => {
    const ch = supabase.channel("my-loans")
      .on("postgres_changes", { event: "*", schema: "public", table: "loans" }, () => {
        qc.invalidateQueries({ queryKey: ["my-loans"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Meus empréstimos</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o status das suas solicitações.</p>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3 font-medium">Livro</th>
              <th className="p-3 font-medium">Solicitado em</th>
              <th className="p-3 font-medium">Devolução</th>
              <th className="p-3 font-medium">Status</th>
            </tr></thead>
            <tbody>
              {(data as any[]).map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="p-3 font-medium">{l.books?.title ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{l.loan_date}</td>
                  <td className="p-3 text-muted-foreground">{l.due_date}</td>
                  <td className="p-3"><span className="text-xs uppercase tracking-wide">{STATUS_LABEL[l.status] ?? l.status}</span></td>
                </tr>
              ))}
              {data.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Você ainda não solicitou empréstimos.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
