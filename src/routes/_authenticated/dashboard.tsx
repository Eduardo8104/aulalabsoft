import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { dashboardQueryOptions, currentUserQueryOptions } from "@/lib/query-options";
import { claimAdminIfFirst } from "@/lib/server-functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookOpen, Users, Repeat, AlertTriangle, CheckCircle2, Library, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions()),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function ClaimAdminCard() {
  const { data: me } = useQuery(currentUserQueryOptions());
  const claim = useServerFn(claimAdminIfFirst);
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);

  if (!me) return null;
  if (me.roles?.includes("admin")) return null;

  const handleClaim = async () => {
    setLoading(true);
    try {
      const res = await claim();
      if (res.granted) {
        toast.success("Você agora é administrador.");
        qc.invalidateQueries({ queryKey: ["current-user"] });
      } else {
        toast.error("Já existe um administrador. Solicite acesso a ele.");
      }
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao reivindicar admin.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-primary/40 bg-primary/5">
      <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Você ainda não é administrador</p>
            <p className="text-xs text-muted-foreground">
              Se ninguém reivindicou ainda, você pode se tornar o primeiro admin do sistema.
            </p>
          </div>
        </div>
        <Button onClick={handleClaim} disabled={loading}>
          {loading ? "Processando..." : "Tornar-me admin"}
        </Button>
      </CardContent>
    </Card>
  );
}

function Stat({ icon: Icon, label, value, tone = "primary" }: { icon: typeof BookOpen; label: string; value: number | string; tone?: string }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-semibold">{value}</p>
          </div>
          <div className={`flex h-10 w-10 items-center justify-center rounded-md bg-${tone}/10 text-${tone}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { data } = useSuspenseQuery(dashboardQueryOptions());
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Painel</h1>
        <p className="text-sm text-muted-foreground">Visão geral da biblioteca.</p>
      </div>
      <ClaimAdminCard />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat icon={Library} label="Títulos" value={data.totalTitles} />
        <Stat icon={BookOpen} label="Exemplares disponíveis" value={data.availableBooks} />
        <Stat icon={Repeat} label="Empréstimos ativos" value={data.activeLoans} />
        <Stat icon={AlertTriangle} label="Vencidos" value={data.overdueLoans} />
        <Stat icon={Users} label="Membros" value={data.totalMembers} />
        <Stat icon={CheckCircle2} label="Estoque total" value={data.totalBooks} />
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Empréstimos recentes</CardTitle></CardHeader>
        <CardContent>
          {data.recentLoans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum empréstimo registrado ainda.</p>
          ) : (
            <ul className="divide-y divide-border">
              {data.recentLoans.map((l: any) => (
                <li key={l.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <p className="font-medium">{l.books?.title ?? "—"}</p>
                    <p className="text-xs text-muted-foreground">{l.members?.full_name ?? "—"} • {l.loan_date}</p>
                  </div>
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{l.status}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
