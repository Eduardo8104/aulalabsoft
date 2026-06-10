import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { loansQueryOptions, booksQueryOptions, membersQueryOptions } from "@/lib/query-options";
import { createLoan, returnLoan, approveLoan, rejectLoan } from "@/lib/server-functions";
import { useStaffGuard } from "@/hooks/use-role";
import { Check, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Undo2 } from "lucide-react";
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
      qc.invalidateQueries({ queryKey: ["loans"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err: any) { toast.error(err.message); }
  }

  const statusLabel: Record<string, string> = { pending: "Pendente", active: "Ativo", overdue: "Atrasado", returned: "Devolvido", rejected: "Rejeitado" };


  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div><h1 className="text-2xl font-display font-bold tracking-tight">Empréstimos</h1><p className="text-sm text-muted-foreground mt-0.5">{loans.length} registros</p></div>
        <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1.5" />Novo empréstimo</Button>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3 font-semibold">Código</th><th className="p-3 font-semibold">Membro</th><th className="p-3 font-semibold">Livro</th>
              <th className="p-3 font-semibold">Emprestado</th><th className="p-3 font-semibold">Devolução prevista</th><th className="p-3 font-semibold">Status</th><th></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {loans.map((l: any) => {
                const overdue = l.status !== "returned" && l.due_date < today;
                return (
                  <tr key={l.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3 font-mono text-xs text-muted-foreground">{l.code}</td>
                    <td className="p-3 font-medium text-foreground">{l.members?.full_name}</td>
                    <td className="p-3 text-foreground">{l.books?.title}</td>
                    <td className="p-3 text-muted-foreground">{l.loan_date}</td>
                    <td className={`p-3 ${overdue ? "text-destructive font-semibold" : "text-muted-foreground"}`}>{l.due_date}</td>
                    <td className="p-3"><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${l.status === "returned" ? "bg-success/10 text-success border border-success/20" : overdue ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"}`}>{overdue && l.status !== "returned" ? "Atrasado" : statusLabel[l.status]}</span></td>
                    <td className="p-3 text-right space-x-1">
                      {l.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try { await approve({ data: { id: l.id } }); toast.success("Aprovado"); invalidateAll(); }
                            catch (e: any) { toast.error(e.message); }
                          }}><Check className="h-3.5 w-3.5 mr-1" />Aprovar</Button>
                          <Button size="sm" variant="ghost" onClick={async () => {
                            try { await reject({ data: { id: l.id } }); toast.success("Rejeitado"); invalidateAll(); }
                            catch (e: any) { toast.error(e.message); }
                          }}><XIcon className="h-3.5 w-3.5 mr-1" />Rejeitar</Button>
                        </>
                      )}
                      {l.status === "active" && (
                        <Button size="sm" variant="ghost" onClick={async () => {
                          try { await ret({ data: { id: l.id } }); toast.success("Devolvido"); invalidateAll(); }
                          catch (e: any) { toast.error(e.message); }
                        }}><Undo2 className="h-3.5 w-3.5 mr-1" />Devolver</Button>
                      )}
                    </td>

                  </tr>
                );
              })}
              {loans.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum empréstimo.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Novo empréstimo</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label>Membro</Label>
              <select name="member_id" required className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione...</option>
                {members.map((m: any) => <option key={m.id} value={m.id}>{m.full_name} ({m.code})</option>)}
              </select>
            </div>
            <div>
              <Label>Livro</Label>
              <select name="book_id" required className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">Selecione...</option>
                {availableBooks.map((b: any) => <option key={b.id} value={b.id}>{b.title} ({(b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0)} disp.)</option>)}
              </select>
            </div>
            <div><Label>Data prevista de devolução</Label><Input name="due_date" type="date" required defaultValue={new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)} /></div>
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
