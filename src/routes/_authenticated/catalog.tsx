import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { catalogQueryOptions } from "@/lib/query-options";
import { requestLoan } from "@/lib/server-functions";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { BookOpen, Search } from "lucide-react";
import noCover from "@/assets/no-cover.svg";

export const Route = createFileRoute("/_authenticated/catalog")({
  loader: ({ context }) => context.queryClient.ensureQueryData(catalogQueryOptions()),
  component: CatalogPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function CatalogPage() {
  const { data } = useSuspenseQuery(catalogQueryOptions());
  const qc = useQueryClient();
  const reqFn = useServerFn(requestLoan);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<any>(null);
  const [due, setDue] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 14);
    return d.toISOString().slice(0, 10);
  });
  const [loading, setLoading] = useState(false);

  // Realtime updates from books table
  useEffect(() => {
    const ch = supabase.channel("catalog-books")
      .on("postgres_changes", { event: "*", schema: "public", table: "books" }, () => {
        qc.invalidateQueries({ queryKey: ["catalog"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [qc]);

  const filtered = useMemo(() => {
    const s = q.toLowerCase();
    return (data as any[]).filter(b =>
      b.title.toLowerCase().includes(s) ||
      b.author.toLowerCase().includes(s) ||
      (b.publishers?.name ?? "").toLowerCase().includes(s),
    );
  }, [data, q]);

  async function submit() {
    if (!open) return;
    setLoading(true);
    try {
      await reqFn({ data: { book_id: open.id, due_date: due } });
      toast.success("Solicitação enviada. Aguarde aprovação.");
      setOpen(null);
      qc.invalidateQueries({ queryKey: ["my-loans"] });
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao solicitar.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Catálogo</h1>
        <p className="text-sm text-muted-foreground">{(data as any[]).length} títulos disponíveis para consulta.</p>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por título, autor ou editora..." value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((b: any) => {
          const available = (b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0);
          return (
            <Card key={b.id}>
              <CardContent className="p-4 flex gap-3">
                <div className="h-20 w-14 shrink-0 rounded-sm bg-muted overflow-hidden">
                  <img
                    src={b.cover_url || noCover}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = noCover; }}
                    alt={b.title}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{b.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{b.author}</p>
                  <p className="text-xs text-muted-foreground mt-1">{b.publishers?.name ?? "—"}</p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-xs ${available > 0 ? "text-primary" : "text-muted-foreground"}`}>
                      {available > 0 ? `${available} disponível(is)` : "Indisponível"}
                    </span>
                    <Button size="sm" disabled={available <= 0} onClick={() => setOpen(b)}>Solicitar</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nenhum livro encontrado.</p>}
      </div>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Solicitar empréstimo</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <p className="text-sm"><strong>{open?.title}</strong></p>
            <p className="text-xs text-muted-foreground">{open?.author}</p>
            <Label className="mt-2 block">Data prevista para devolução</Label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(null)}>Cancelar</Button>
            <Button onClick={submit} disabled={loading}>{loading ? "Enviando..." : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
