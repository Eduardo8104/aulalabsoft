import { useStaffGuard } from "@/hooks/use-role";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { booksQueryOptions, publishersQueryOptions, categoriesQueryOptions } from "@/lib/query-options";
import { upsertBook, deleteBook, uploadBookCover } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import noCover from "@/assets/no-cover.svg";

const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(new Error("Falha ao ler o arquivo."));
    r.onload = () => {
      const result = String(r.result ?? "");
      const idx = result.indexOf(",");
      resolve(idx >= 0 ? result.slice(idx + 1) : result);
    };
    r.readAsDataURL(file);
  });
}

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
  useStaffGuard();
  const { data: books } = useSuspenseQuery(booksQueryOptions());
  const { data: publishers } = useSuspenseQuery(publishersQueryOptions());
  const { data: categories } = useSuspenseQuery(categoriesQueryOptions());
  const qc = useQueryClient();
  const upsert = useServerFn(upsertBook);
  const upload = useServerFn(uploadBookCover);
  const del = useServerFn(deleteBook);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reset cover state when dialog opens for a new/edit book
  useEffect(() => {
    if (open) {
      setCoverUrl(editing?.cover_url ?? "");
      setPreview(editing?.cover_url ?? "");
      setCoverFile(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open, editing]);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!ALLOWED_TYPES.includes(f.type)) {
      toast.error("Formato inválido. Use JPG, PNG ou WEBP.");
      e.target.value = "";
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Imagem maior que 5 MB.");
      e.target.value = "";
      return;
    }
    setCoverFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clearCover() {
    setCoverFile(null);
    setCoverUrl("");
    setPreview("");
    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = books.filter((b: any) =>
    b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      let finalCover = coverUrl;
      if (coverFile) {
        setUploading(true);
        const base64 = await fileToBase64(coverFile);
        const res = await upload({ data: {
          filename: coverFile.name,
          contentType: coverFile.type as any,
          base64,
        }});
        finalCover = res.url;
        setUploading(false);
      }
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
        cover_url: finalCover,
      }});
      toast.success("Livro salvo");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["books"] });
    } catch (err: any) { setUploading(false); toast.error(err.message ?? "Falha ao salvar."); }
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
              <th className="p-3 font-medium w-12">Capa</th>
              <th className="p-3 font-medium">Código</th><th className="p-3 font-medium">Título</th><th className="p-3 font-medium">Autor</th>
              <th className="p-3 font-medium">Editora</th><th className="p-3 font-medium">Disponível</th><th className="p-3"></th>
            </tr></thead>
            <tbody>
              {filtered.map((b: any) => (
                <tr key={b.id} className="border-t border-border">
                  <td className="p-2">
                    <img
                      src={b.cover_url || noCover}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = noCover; }}
                      alt={b.title}
                      className="h-12 w-9 object-cover rounded-sm bg-muted"
                    />
                  </td>
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
              {filtered.length === 0 && <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">Nenhum livro encontrado.</td></tr>}
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
            <div className="col-span-2">
              <Label>Capa do livro <span className="text-xs text-muted-foreground font-normal">(opcional, JPG/PNG/WEBP, máx. 5 MB)</span></Label>
              <div className="mt-1.5 flex items-start gap-3">
                <div className="h-28 w-20 shrink-0 rounded-sm border border-border bg-muted overflow-hidden">
                  <img
                    src={preview || noCover}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = noCover; }}
                    alt="Pré-visualização da capa"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={onFileChange}
                    className="hidden"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {preview ? "Trocar imagem" : "Selecionar imagem"}
                    </Button>
                    {(preview || coverUrl) && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearCover}>
                        <X className="h-3.5 w-3.5 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  {coverFile && (
                    <p className="text-xs text-muted-foreground truncate">
                      {coverFile.name} — {(coverFile.size / 1024).toFixed(0)} KB
                    </p>
                  )}
                  {!coverFile && coverUrl && (
                    <p className="text-xs text-muted-foreground truncate">Capa atual mantida.</p>
                  )}
                </div>
              </div>
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
              <Button type="submit" disabled={uploading}>{uploading ? "Enviando imagem..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
