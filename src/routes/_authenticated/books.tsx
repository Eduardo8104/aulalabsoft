import { useStaffGuard } from "@/hooks/use-role";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import { booksQueryOptions, publishersQueryOptions, categoriesQueryOptions } from "@/lib/query-options";
import { upsertBook, deleteBook, uploadBookCover, lookupBookByIsbn } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Upload, X, Search, BookOpen, FileText } from "lucide-react";
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
  const lookup = useServerFn(lookupBookByIsbn);
  const del = useServerFn(deleteBook);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const [looking, setLooking] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (open) {
      setCoverUrl(editing?.cover_url ?? "");
      setPreview(editing?.cover_url ?? "");
      setCoverFile(null);
      setFormKey((k) => k + 1);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [open, editing]);

  async function handleIsbnLookup() {
    const form = formRef.current;
    if (!form) return;
    const isbnInput = form.elements.namedItem("isbn") as HTMLInputElement | null;
    const raw = isbnInput?.value?.trim() ?? "";
    if (!raw) { toast.error("Informe o ISBN antes de buscar."); return; }
    setLooking(true);
    try {
      const r = await lookup({ data: { isbn: raw } });
      const setVal = (name: string, v: string | number | null | undefined) => {
        const el = form.elements.namedItem(name) as HTMLInputElement | HTMLSelectElement | null;
        if (el && v != null && v !== "") el.value = String(v);
      };
      setVal("title", r.title);
      setVal("author", r.author);
      setVal("publication_year", r.publication_year);
      if (r.cover_url) {
        setCoverUrl(r.cover_url);
        setPreview(r.cover_url);
        setCoverFile(null);
        if (fileRef.current) fileRef.current.value = "";
      }
      const missing: string[] = [];
      if (r.publisher) missing.push(`Editora sugerida: ${r.publisher}`);
      if (r.category) missing.push(`Categoria sugerida: ${r.category}`);
      toast.success(
        "Dados preenchidos pelo ISBN." + (missing.length ? " " + missing.join(" • ") : ""),
      );
    } catch (err: any) {
      toast.error(err?.message ?? "Não foi possível buscar este ISBN.");
    } finally {
      setLooking(false);
    }
  }

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
      <div className="flex items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Livros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{books.length} títulos no acervo</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }} className="shadow-sm"><Plus className="h-4 w-4 mr-1.5" />Novo livro</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por título ou autor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground w-14">Capa</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Código</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Título</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Autor</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Editora</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Disponível</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((b: any) => {
                const available = (b.total_quantity ?? 0) - (b.borrowed_quantity ?? 0);
                return (
                  <tr key={b.id} className="hover:bg-muted/20 transition-colors group">
                    <td className="p-2 pl-3">
                      <img
                        src={b.cover_url || noCover}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = noCover; }}
                        alt={b.title}
                        className="h-14 w-10 object-cover bg-muted shadow-sm"
                      />
                    </td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{b.code}</td>
                    <td className="p-3 font-medium text-foreground">{b.title}</td>
                    <td className="p-3 text-muted-foreground">{b.author}</td>
                    <td className="p-3 text-muted-foreground">{b.publishers?.name ?? <span className="text-muted-foreground/50">—</span>}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-[60px] h-1.5 bg-muted overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${available > 0 ? "bg-success" : "bg-destructive"}`}
                            style={{ width: `${Math.min(100, (available / (b.total_quantity || 1)) * 100)}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-foreground">{available}/{b.total_quantity}</span>
                      </div>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => { setEditing(b); setOpen(true); }} className="h-8 w-8 p-0">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(b.id)} className="h-8 w-8 p-0 text-destructive hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhum livro encontrado</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {search ? "Tente ajustar sua busca." : "Clique em \"Novo livro\" para adicionar."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-secondary" />
              {editing ? "Editar livro" : "Novo livro"}
            </DialogTitle>
          </DialogHeader>
          <form key={formKey} ref={formRef} onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Código</Label><Input name="code" required defaultValue={editing?.code} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">ISBN</Label>
              <div className="flex gap-1.5">
                <Input name="isbn" defaultValue={editing?.isbn ?? ""} placeholder="978..." />
                <Button type="button" variant="outline" size="sm" onClick={handleIsbnLookup} disabled={looking} title="Buscar dados pelo ISBN">
                  <Search className="h-3.5 w-3.5 mr-1" />{looking ? "Buscando..." : "Buscar"}
                </Button>
              </div>
            </div>
            <div className="col-span-2 space-y-1.5"><Label className="text-xs uppercase tracking-wider">Título</Label><Input name="title" required defaultValue={editing?.title} /></div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Autor</Label><Input name="author" required defaultValue={editing?.author} /></div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Ano</Label><Input name="publication_year" type="number" defaultValue={editing?.publication_year ?? ""} /></div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Editora</Label>
              <select name="publisher_id" defaultValue={editing?.publisher_id ?? ""} className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">—</option>
                {publishers.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Categoria</Label>
              <select name="category_id" defaultValue={editing?.category_id ?? ""} className="w-full h-9 border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="">—</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider">Quantidade</Label><Input name="total_quantity" type="number" min={0} required defaultValue={editing?.total_quantity ?? 1} /></div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-xs uppercase tracking-wider">Capa <span className="text-xs text-muted-foreground font-normal">(opcional, JPG/PNG/WEBP)</span></Label>
              <div className="mt-1 flex items-start gap-3">
                <div className="h-28 w-20 shrink-0 border border-border bg-muted overflow-hidden">
                  <img
                    src={preview || noCover}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = noCover; }}
                    alt="Pré-visualização"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <input ref={fileRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={onFileChange} className="hidden" />
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      {preview ? "Trocar" : "Selecionar"}
                    </Button>
                    {(preview || coverUrl) && (
                      <Button type="button" variant="ghost" size="sm" onClick={clearCover}>
                        <X className="h-3.5 w-3.5 mr-1" /> Remover
                      </Button>
                    )}
                  </div>
                  {coverFile && <p className="text-xs text-muted-foreground truncate">{coverFile.name} — {(coverFile.size / 1024).toFixed(0)} KB</p>}
                  {!coverFile && coverUrl && <p className="text-xs text-muted-foreground truncate">Capa atual mantida.</p>}
                </div>
              </div>
            </div>
            <DialogFooter className="col-span-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Cancelar</Button>
              <Button type="submit" disabled={uploading}>{uploading ? "Enviando..." : "Salvar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
