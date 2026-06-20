import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { dashboardQueryOptions } from "@/lib/query-options";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, Users, Repeat, AlertTriangle, CheckCircle2, Library, ArrowUp, ArrowDown, Plus, BookMarked, BarChart3, Activity } from "lucide-react";
import { useStaffGuard } from "@/hooks/use-role";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from "recharts";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/dashboard")({
  loader: ({ context }) => context.queryClient.ensureQueryData(dashboardQueryOptions()),
  component: DashboardPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

const LOAN_COLORS = { active: "#0D3B3B", returned: "#2D7D46", overdue: "#9B2C2C", pending: "#B58B2A" };

function SparklineChart({ data, color }: { data: { value: number }[]; color: string }) {
  return (
    <div className="h-8 w-20">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id={`sparkGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="value" stroke={color} strokeWidth={1.5} fill={`url(#sparkGrad-${color.replace("#", "")})`} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, trend, trendUp, color, sparkData }: {
  icon: typeof BookOpen; label: string; value: number | string; trend?: string; trendUp?: boolean; color?: string; sparkData?: { value: number }[];
}) {
  return (
    <Card className="transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md animate-fade-in-up">
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
            <p className="mt-1.5 text-2xl font-display font-bold">{value}</p>
            {trend && (
              <p className={`flex items-center gap-1 mt-1.5 text-xs font-medium ${trendUp ? "text-success" : "text-destructive"}`}>
                {trendUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                {trend}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex h-11 w-11 items-center justify-center border ${color ? `border-${color}/30` : "border-secondary/30"} bg-primary/5 text-primary`}>
              <Icon className="h-5 w-5" />
            </div>
            {sparkData && <SparklineChart data={sparkData} color="#0D3B3B" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  useStaffGuard();
  const { data } = useSuspenseQuery(dashboardQueryOptions());

  const loanStatusData = [
    { name: "Ativos", value: data.activeLoans, color: LOAN_COLORS.active },
    { name: "Devolvidos", value: data.totalLoans - data.activeLoans - data.overdueLoans, color: LOAN_COLORS.returned },
    { name: "Atrasados", value: data.overdueLoans, color: LOAN_COLORS.overdue },
  ].filter(d => d.value > 0);

  const stockData = [
    { name: "Disponível", value: data.availableBooks, color: "#2D7D46" },
    { name: "Emprestado", value: data.borrowedBooks, color: "#B58B2A" },
  ];

  const sparklineData = [
    { value: Math.floor(data.activeLoans * 0.6) },
    { value: Math.floor(data.activeLoans * 0.8) },
    { value: Math.floor(data.activeLoans * 0.7) },
    { value: Math.floor(data.activeLoans * 0.9) },
    { value: data.activeLoans },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active": return <Repeat className="h-3.5 w-3.5 text-primary" />;
      case "returned": return <CheckCircle2 className="h-3.5 w-3.5 text-success" />;
      case "overdue": return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
      case "pending": return <Activity className="h-3.5 w-3.5 text-secondary" />;
      default: return <Activity className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "border-l-primary";
      case "returned": return "border-l-success";
      case "overdue": return "border-l-destructive";
      case "pending": return "border-l-secondary";
      default: return "border-l-border";
    }
  };

  const statusLabel: Record<string, string> = { pending: "Pendente", active: "Ativo", overdue: "Atrasado", returned: "Devolvido", rejected: "Rejeitado" };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border pb-4 gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Visão geral da biblioteca.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/books" className="flex-1 md:flex-none">
            <Button variant="outline" size="sm" className="w-full md:w-auto"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo livro</Button>
          </Link>
          <Link to="/loans" className="flex-1 md:flex-none">
            <Button size="sm" className="w-full md:w-auto"><Plus className="h-3.5 w-3.5 mr-1.5" />Novo empréstimo</Button>
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Library} label="Títulos" value={data.totalTitles} trend="+12% este mês" trendUp sparkData={sparklineData} />
        <StatCard icon={BookOpen} label="Disponíveis" value={data.availableBooks} trend={`${data.totalBooks} no total`} trendUp />
        <StatCard icon={Repeat} label="Empréstimos ativos" value={data.activeLoans} />
        <StatCard icon={AlertTriangle} label="Atrasados" value={data.overdueLoans} trend={data.overdueLoans > 0 ? `${data.overdueLoans} pendentes` : "Nenhum"} trendUp={data.overdueLoans === 0} />
        <StatCard icon={Users} label="Membros" value={data.totalMembers} />
        <StatCard icon={CheckCircle2} label="Total de exemplares" value={data.totalBooks} />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Stock Chart */}
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display font-bold flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-secondary" />
              Distribuição do acervo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stockData} barCategoryGap="20%">
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6B8A7A" }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #D6CEC0", borderRadius: 0, fontSize: 12 }}
                  formatter={(v: number) => [`${v} exemplares`, ""]}
                />
                <Bar dataKey="value" radius={[0, 0, 0, 0]} barSize={60}>
                  {stockData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Loan Status Pie */}
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-display font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-secondary" />
              Status dos empréstimos
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={loanStatusData} cx="50%" cy="50%" innerRadius={35} outerRadius={65} paddingAngle={2} dataKey="value">
                  {loanStatusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #D6CEC0", borderRadius: 0, fontSize: 12 }}
                  formatter={(v: number, n: string) => [`${v}`, n]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {loanStatusData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <span className="h-2.5 w-2.5" style={{ background: d.color }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="font-semibold text-foreground">{d.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity + Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        {/* Recent Loans Timeline */}
        <Card className="md:col-span-2 animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-bold">Atividade recente</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {data.recentLoans.length === 0 ? (
              <div className="py-8 text-center">
                <Activity className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade recente.</p>
              </div>
            ) : (
              <div className="space-y-0">
                {data.recentLoans.map((l: any, i: number) => (
                  <div key={l.id} className={`flex items-center gap-4 py-3 border-l-2 pl-4 ${getStatusColor(l.status)} ${i > 0 ? "border-t border-t-border/50 pt-3" : ""}`}>
                    <div className="flex h-8 w-8 items-center justify-center bg-muted shrink-0">
                      {getStatusIcon(l.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{l.books?.title ?? "—"}</p>
                      <p className="text-xs text-muted-foreground truncate">{l.members?.full_name ?? "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 ${
                        l.status === "returned" ? "bg-success/10 text-success" :
                        l.status === "overdue" ? "bg-destructive/10 text-destructive" :
                        l.status === "pending" ? "bg-secondary/10 text-secondary" :
                        "bg-primary/10 text-primary"
                      }`}>
                        {statusLabel[l.status] ?? l.status}
                      </span>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{l.loan_date}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="animate-fade-in-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-display font-bold">Ações rápidas</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            {[
              { icon: Plus, label: "Novo empréstimo", to: "/loans", color: "text-primary" },
              { icon: BookOpen, label: "Adicionar livro", to: "/books", color: "text-secondary" },
              { icon: Users, label: "Cadastrar membro", to: "/members", color: "text-success" },
              { icon: BookMarked, label: "Ver catálogo", to: "/catalog", color: "text-primary" },
            ].map((action) => (
              <Link key={action.label} to={action.to}>
                <div className="flex items-center gap-3 p-3 border border-border hover:bg-accent hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group">
                  <div className="flex h-9 w-9 items-center justify-center bg-primary/5 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <span className="text-sm font-medium text-foreground">{action.label}</span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
