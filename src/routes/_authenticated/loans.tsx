import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { loansQueryOptions, booksQueryOptions, membersQueryOptions } from "@/lib/query-options";
import { createLoan, returnLoan, approveLoan, rejectLoan } from "@/lib/server-functions";
import { useStaffGuard } from "@/hooks/use-role";
import { Check, X as XIcon, Repeat, Undo2, AlertTriangle, Clock, CheckCircle2, Ban, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/loans")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(loansQueryOptions()),
    context.queryClient.ensureQueryData(booksQueryOptions()),
    context.queryClient.ensureQueryData(membersQueryOptions()),
  ]),
  component: LoansPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

const statusLabel: Record<string, string> = { pending: "Pendente", active: "Ativo", overdue: "Atrasado", returned: "Devolvido", rejected: "Rejeitado" };

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
      {statusLabel[finalStatus] || status}
    </span>
  );
}

function LoansPage() {
  useStaffGuard();
  const { data: loans } = useSuspenseQuery(loansQueryOptions());
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  const { data: members } = useSuspenseQuery(membersQueryOptions());
  const qc = useQueryClient();
  const create = useServerFn(createLoan);
  const ret = useServerFn(returnLoan);
  const approve = useServerFn(approveLoan);
  const reject = useServerFn(rejectLoan);
  const [open, setOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  function invalidateAll() {
    qc.invalidateQueries({ queryKey: ["loans"] });
    qc.invalidateQueries({ queryKey: ["books"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
  }

  const availableBooks = books.filter((b: any) => (b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0) > 0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await create({ data: {
        member_id: String(f.get("member_id")),
        book_id: String(f.get("book_id")),
        due_date: String(f.get("due_date")),
      }});
      toast.success("Empréstimo registrado");
      setOpen(false);
      invalidateAll();
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Empréstimos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{loans.length} registros</p>
        </div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Novo empréstimo</Button>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm responsive-table">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Código</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Membro</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Livro</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Emprestado</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Devolução</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="p-3 w-44"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loans.map((l: any) => {
                const overdue = l.status !== "returned" && l.due_date < today;
                return (
                  <tr key={l.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3 font-mono text-xs text-muted-foreground" data-label="Código">{l.code}</td>
                    <td className="p-3 font-medium text-foreground" data-label="Membro">{l.members?.full_name}</td>
                    <td className="p-3 text-foreground" data-label="Livro">{l.books?.title}</td>
                    <td className="p-3 text-muted-foreground" data-label="Emprestado">{l.loan_date}</td>
                    <td className={`p-3 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`} data-label="Devolução">{l.due_date}</td>
                    <td className="p-3" data-label="Status"><StatusBadge status={l.status} overdue={overdue} /></td>
                    <td className="p-3 text-right" data-label="">
                      <div className="flex items-center justify-end gap-1">
                        {l.status === "pending" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              try { await approve({ data: { id: l.id } }); toast.success("Aprovado"); invalidateAll(); }
                              catch (e: any) { toast.error(e.message); }
                            }} className="text-success hover:text-success h-8 px-2 text-xs font-medium">
                              <Check className="h-3.5 w-3.5 mr-1" />Aprovar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={async () => {
                              try { await reject({ data: { id: l.id } }); toast.success("Rejeitado"); invalidateAll(); }
                              catch (e: any) { toast.error(e.message); }
                            }} className="text-destructive hover:text-destructive h-8 px-2 text-xs font-medium">
                              <XIcon className="h-3.5 w-3.5 mr-1" />Rejeitar
                            </Button>
                          </>
                        )}
                        {l.status === "active" && (
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try { await ret({ data: { id: l.id } }); toast.success("Devolvido"); invalidateAll(); }
                            catch (e: any) { toast.error(e.message); }
                          }} className="h-8 px-2 text-xs font-medium">
                            <Undo2 className="h-3.5 w-3.5 mr-1" />Devolver
                          </Button>
                        )}
                        {(l.status === "returned" || l.status === "rejected" || (overdue && l.status !== "active")) && (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhum empréstimo registrado</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Novo empréstimo" para começar.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-secondary" />
              Novo empréstimo
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Membro</Label>
              <select name="member_id" required className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Selecione...</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} ({m.code})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Livro</Label>
              <select name="book_id" required className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">Selecione...</option>
                {availableBooks.map((b: any) => <option key={b.id} value={b.id}>{b.title} ({(b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0)} disp.)</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Data prevista de devolução</Label><Input name="due_date" type="date" required defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Registrar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
