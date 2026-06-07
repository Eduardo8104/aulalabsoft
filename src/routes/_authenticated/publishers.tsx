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
import { Plus, Pencil, Trash2 } from "lucide-react";
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
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-semibold tracking-tight">Editoras</h1><p className="text-sm text-muted-foreground">{data.length} editoras</p></div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Nova</Button>
      </div>
      <Card><CardContent className="p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50"><tr className="text-left">
            <th className="p-3 font-medium">Código</th><th className="p-3 font-medium">Nome</th><th className="p-3 font-medium">E-mail</th><th className="p-3 font-medium">Telefone</th><th></th>
          </tr></thead>
          <tbody>
            {data.map((p: any) => (
              <tr key={p.id} className="border-t border-border">
                <td className="p-3 font-mono text-xs">{p.code}</td>
                <td className="p-3 font-medium">{p.name}</td>
                <td className="p-3 text-muted-foreground">{p.email ?? "—"}</td>
                <td className="p-3 text-muted-foreground">{p.phone ?? "—"}</td>
                <td className="p-3 text-right space-x-1">
                  <Button size="sm" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    if (!confirm("Excluir?")) return;
                    try { await del({ data: { id: p.id } }); toast.success("Excluída"); qc.invalidateQueries({ queryKey: ["publishers"] }); }
                    catch (e: any) { toast.error(e.message); }
                  }}><Trash2 className="h-3.5 w-3.5" /></Button>
                </td>
              </tr>
            ))}
            {data.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">Nenhuma editora.</td></tr>}
          </tbody>
        </table>
      </CardContent></Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar editora" : "Nova editora"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div><Label>Código</Label><Input name="code" required defaultValue={editing?.code} /></div>
            <div><Label>Nome</Label><Input name="name" required defaultValue={editing?.name} /></div>
            <div><Label>E-mail</Label><Input name="email" type="email" defaultValue={editing?.email ?? ""} /></div>
            <div><Label>Telefone</Label><Input name="phone" defaultValue={editing?.phone ?? ""} /></div>
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
