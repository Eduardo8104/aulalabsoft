import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQueryOptions } from "@/lib/query-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, Repeat, AlertTriangle, CheckCircle2, Library } from "lucide-react";
import { useStaffGuard } from "@/hooks/use-role";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions()),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function Stat({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: number | string }) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className="mt-1.5 text-2xl font-display font-bold">{value}</p>
          </div>
          <div className="flex h-11 w-11 items-center justify-center border border-secondary/30 bg-primary/5 text-primary">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  useStaffGuard();
  const { data } = useSuspenseQuery(dashboardQueryOptions());
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="border-b border-border pb-4">
        <h1 className="text-2xl font-display font-bold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Visão geral da biblioteca.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Library} label="Títulos" value={data.totalTitles} />
        <Stat icon={BookOpen} label="Exemplares disponíveis" value={data.availableBooks} />
        <Stat icon={Repeat} label="Empréstimos ativos" value={data.activeLoans} />
        <Stat icon={AlertTriangle} label="Vencidos" value={data.overdueLoans} />
        <Stat icon={Users} label="Membros" value={data.totalMembers} />
        <Stat icon={CheckCircle2} label="Estoque total" value={data.totalBooks} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base font-display font-bold">Empréstimos recentes</CardTitle></CardHeader>
        <CardContent>
          {data.recentLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum empréstimo registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentLoans.map((l: any) => (
                <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">{l.books?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{l.members?.full_name ?? "—"} • {l.loan_date}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
