import { useStaffGuard } from "@/hooks/use-role";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { categoriesQueryOptions } from "@/lib/query-options";
import { upsertCategory, deleteCategory } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/categories")({
  loader: ({ context }) => context.queryClient.ensureQueryData(categoriesQueryOptions()),
  component: CategoriesPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function CategoriesPage() {
  useStaffGuard();
  const { data } = useSuspenseQuery(categoriesQueryOptions());
  const qc = useQueryClient();
  const upsert = useServerFn(upsertCategory);
  const del = useServerFn(deleteCategory);
  const [name, setName] = useState("");

  async function add() {
    if (!name.trim()) return;
    try { await upsert({ data: { name: name.trim() } }); setName(""); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Categoria criada"); }
    catch (e: any) { toast.error(e.message); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div><h1 className="text-2xl font-semibold tracking-tight">Categorias</h1><p className="text-sm text-muted-foreground">{data.length} categorias</p></div>
      <div className="flex gap-2 max-w-md">
        <Input placeholder="Nome da categoria" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add}><Plus className="h-4 w-4" /></Button>
      </div>
      <Card><CardContent className="p-0">
        <ul className="divide-y divide-border">
          {data.map((c: any) => (
            <li key={c.id} className="flex items-center justify-between p-3 text-sm">
              <span>{c.name}</span>
              <Button size="sm" variant="ghost" onClick={async () => {
                if (!confirm("Excluir?")) return;
                try { await del({ data: { id: c.id } }); qc.invalidateQueries({ queryKey: ["categories"] }); }
                catch (e: any) { toast.error(e.message); }
              }}><Trash2 className="h-3.5 w-3.5" /></Button>
            </li>
          ))}
          {data.length === 0 && <li className="p-8 text-center text-muted-foreground text-sm">Nenhuma categoria.</li>}
        </ul>
      </CardContent></Card>
    </div>
  );
}
