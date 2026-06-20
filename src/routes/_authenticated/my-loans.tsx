import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { myLoansQueryOptions } from "@/lib/query-options";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, CheckCircle2, Clock, Ban, Repeat, BookOpen } from "lucide-react";

export const Route = createFileRoute("/_authenticated/my-loans")({
  loader: ({ context }) => context.queryClient.ensureQueryData(myLoansQueryOptions()),
  component: MyLoansPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente", active: "Ativo", returned: "Devolvido", rejected: "Rejeitado", overdue: "Vencido",
};

function StatusBadge({ status, overdue }: { status: string; overdue?: boolean }) {
  const finalStatus = overdue && status !== "returned" ? "overdue" : status;
  const styles: Record<string, string> = {
    pending: "bg-secondary/10 text-secondary border-secondary/20",
    active: "bg-primary/10 text-primary border-primary/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
    returned: "bg-success/10 text-success border-success/20",
    rejected: "bg-muted text-muted-foreground border-border",
  };
  const icons: Record<string, typeof Clock> = {
    pending: Clock, active: Repeat, overdue: AlertTriangle, returned: CheckCircle2, rejected: Ban,
  };
  const Icon = icons[finalStatus] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 border ${styles[finalStatus] || styles.pending}`}>
      <Icon className="h-3 w-3" />
      {STATUS_LABEL[finalStatus] || status}
    </span>
  );
}

function MyLoansPage() {
  const { data } = useSuspenseQuery(myLoansQueryOptions());
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-display font-bold tracking-tight">Meus empréstimos</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Acompanhe o status das suas solicitações.</p>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm responsive-table">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Livro</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Solicitado em</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Devolução</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(data as any[]).map((l) => {
                const overdue = l.status !== "returned" && l.due_date < today;
                return (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-medium text-foreground" data-label="Livro">{l.books?.title ?? "—"}</td>
                    <td className="p-3 text-muted-foreground" data-label="Solicitado em">{l.loan_date}</td>
                    <td className={`p-3 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`} data-label="Devolução">{l.due_date}</td>
                    <td className="p-3" data-label="Status"><StatusBadge status={l.status} overdue={overdue} /></td>
                  </tr>
                );
              })}
              {(data as any[]).length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BookOpen className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhuma solicitação</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Você ainda não solicitou empréstimos.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    </div>
  );
}
