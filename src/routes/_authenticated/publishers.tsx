import { useStaffGuard } from "@/hooks/use-role";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { publishersQueryOptions } from "@/lib/query-options";
import { upsertPublisher, deletePublisher } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/publishers")({
  loader: ({ context }) => context.queryClient.ensureQueryData(publishersQueryOptions()),
  component: PublishersPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function PublishersPage() {
  useStaffGuard();
  const { data } = useSuspenseQuery(publishersQueryOptions());
  const qc = useQueryClient();
  const upsert = useServerFn(upsertPublisher);
  const del = useServerFn(deletePublisher);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await upsert({ data: {
        id: editing?.id,
        code: String(f.get("code") || ""),
        name: String(f.get("name") || ""),
        email: String(f.get("email") || ""),
        phone: String(f.get("phone") || ""),
      }});
      toast.success("Editora salva");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["publishers"] });
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div><h1 className="text-2xl font-display font-bold tracking-tight">Editoras</h1><p className="text-sm text-muted-foreground mt-0.5">{data.length} editoras</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Nova</Button>
      </div>
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm responsive-table">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Código</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">E-mail</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Telefone</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((p: any) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td data-label="Código" className="p-3 font-mono text-xs text-muted-foreground">{p.code}</td>
                  <td data-label="Nome" className="p-3 font-medium text-foreground">{p.name}</td>
                  <td data-label="E-mail" className="p-3 text-muted-foreground">{p.email ?? "—"}</td>
                  <td data-label="Telefone" className="p-3 text-muted-foreground">{p.phone ?? "—"}</td>
                  <td data-label="Ações" className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={async () => {
                        if (!confirm("Excluir?")) return;
                        try { await del({ data: { id: p.id } }); toast.success("Excluída"); qc.invalidateQueries({ queryKey: ["publishers"] }); }
                        catch (e: any) { toast.error(e.message); }
                      }} className="h-7 w-7 p-0 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Building2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhuma editora cadastrada</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova" para adicionar.</p>
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
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-secondary" />{editing ? "Editar editora" : "Nova editora"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Código</Label><Input name="code" required defaultValue={editing?.code} /></div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Nome</Label><Input name="name" required defaultValue={editing?.name} /></div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Telefone</Label><Input name="phone" defaultValue={editing?.phone ?? ""} /></div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
