import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { booksQueryOptions, publishersQueryOptions, categoriesQueryOptions } from "@/lib/query-options";
import { upsertBook, deleteBook } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/books")({
  loader: ({ context }) => Promise.all([
    context.queryClient.ensureQueryData(booksQueryOptions()),
    context.queryClient.ensureQueryData(publishersQueryOptions()),
    context.queryClient.ensureQueryData(categoriesQueryOptions()),
  ]),
  component: BooksPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

function BooksPage() {
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  const { data: publishers } = useSuspenseQuery(publishersQueryOptions());
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const qc = useQueryClient();
  const upsert = useServerFn(upsertBook);
  const del = useServerFn(deleteBook);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");

  const filtered = books.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      await upsert({ data: {
        id: editing?.id,
        code: String(f.get("code") || ""),
        title: String(f.get("title") || ""),
        author: String(f.get("author") || ""),
        publisher_id: (f.get("publisher_id") as string) || null,
        category_id: (f.get("category_id") as string) || null,
        publication_year: Number(f.get("publication_year")) || null,
        isbn: String(f.get("isbn") || ""),
        total_quantity: Number(f.get("total_quantity") || 1),
        cover_url: String(f.get("cover_url") || ""),
      }});
      toast.success("Livro salvo");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este livro?")) return;
    try {
      await del({ data: { id } });
      toast.success("Livro excluído");
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (err: any) { toast.error(err.message); }
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Livros</h1>
          <p className="text-sm text-muted-foreground">{books.length} títulos no acervo</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Novo livro</Button>
      </div>
      <Input placeholder="Buscar por título ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50"><tr className="text-left">
              <th className="p-3 font-medium">Código</th><th className="p-3 font-medium">Título</th><th className="p-3 font-medium">Autor</th>
              <th className="p-3 font-medium">Editora</th><th className="p-3 font-medium">Disponível</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-3 font-mono text-xs">{b.code}</td>
                  <td className="p-3 font-medium">{b.title}</td>
                  <td className="p-3 text-muted-foreground">{b.author}</td>
                  <td className="p-3 text-muted-foreground">{b.publishers?.name ?? "—"}</td>
                  <td className="p-3">{(b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0)} / {b.total_quantity}</td>
                  <td className="p-3 text-right space-x-1">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-muted-foreground">Nenhum livro encontrado.</td></tr>}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Editar livro" : "Novo livro"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div><Label>Código</Label><Input name="code" required defaultValue={editing?.code} /></div>
            <div><Label>ISBN</Label><Input name="isbn" defaultValue={editing?.isbn ?? ""} /></div>
            <div className="col-span-2"><Label>Título</Label><Input name="title" required defaultValue={editing?.title} /></div>
            <div><Label>Autor</Label><Input name="author" required defaultValue={editing?.author} /></div>
            <div><Label>Ano</Label><Input name="publication_year" type="number" defaultValue={editing?.publication_year ?? ""} /></div>
            <div>
              <Label>Editora</Label>
              <select name="publisher_id" defaultValue={editing?.publisher_id ?? ""} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {publishers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Categoria</Label>
              <select name="category_id" defaultValue={editing?.category_id ?? ""} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm">
                <option value="">—</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><Label>Quantidade total</Label><Input name="total_quantity" type="number" min={0} required defaultValue={editing?.total_quantity ?? 1} /></div>
            <div className="col-span-2"><Label>URL da capa</Label><Input name="cover_url" defaultValue={editing?.cover_url ?? ""} /></div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
