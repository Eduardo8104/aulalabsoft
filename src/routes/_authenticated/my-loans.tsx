import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { myLoansQueryOptions } from "@/lib/query-options";
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


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-display font-bold tracking-tight">Meus empréstimos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Acompanhe o status das suas solicitações.</p>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3 font-semibold">Livro</th>
              <th className="p-3 font-semibold">Solicitado em</th>
              <th className="p-3 font-semibold">Devolução</th>
              <th className="p-3 font-semibold">Status</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {(data as any[]).map((l) => (
                <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                  <td className="p-3 font-medium text-foreground">{l.books?.title ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{l.loan_date}</td>
                  <td className="p-3 text-muted-foreground">{l.due_date}</td>
                  <td className="p-3"><span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[l.status] ?? l.status}</span></td>
                </tr>
              ))}
              {(data as any[]).length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">Você ainda não solicitou empréstimos.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
