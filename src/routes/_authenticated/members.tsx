import { useStaffGuard } from "@/hooks/use-role";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { membersQueryOptions } from "@/lib/query-options";
import { upsertMember, deleteMember } from "@/lib/server-functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Users, Search } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/members")({
  loader: ({ context }) => context.queryClient.ensureQueryData(membersQueryOptions()),
  component: MembersPage,
  errorComponent: ({ error }) => <div className="p-6 text-destructive">Erro: {error.message}</div>,
});

const STAFF_RE = /func|prof|staff|servidor|coorden|diret|bibliotec/i;
const isStaff = (m: any) => STAFF_RE.test(m.member_role ?? "");

function MembersPage() {
  useStaffGuard();
  const { data } = useSuspenseQuery(membersQueryOptions());
  const qc = useQueryClient();
  const upsert = useServerFn(upsertMember);
  const del = useServerFn(deleteMember);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [grade, setGrade] = useState<string>("all");
  const [tab, setTab] = useState<"alunos" | "funcionarios">("alunos");

  const students = useMemo(() => data.filter((m: any) => !isStaff(m)), [data]);
  const staff = useMemo(() => data.filter((m: any) => isStaff(m)), [data]);
  const grades = useMemo(() => {
    const s = new Set<string>();
    students.forEach((m: any) => { if (m.grade) s.add(m.grade); });
    return Array.from(s).sort();
  }, [students]);

  const matchesSearch = (m: any) => m.full_name.toLowerCase().includes(search.toLowerCase());
  const filteredStudents = students.filter((m: any) => matchesSearch(m) && (grade === "all" || m.grade === grade));
  const filteredStaff = staff.filter(matchesSearch);

  function nextCode(prefix: "A" | "F") {
    const re = new RegExp(`^${prefix}-(\\d+)$`);
    const max = data.reduce((acc: number, m: any) => {
      const match = re.exec(m.code ?? "");
      return match ? Math.max(acc, parseInt(match[1], 10)) : acc;
    }, 0);
    return `${prefix}-${String(max + 1).padStart(4, "0")}`;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const obj: any = { id: editing?.id };
    f.forEach((v, k) => { obj[k] = String(v); });
    if (editing) {
      obj.code = editing.code;
    } else {
      const prefix = STAFF_RE.test(obj.member_role ?? "") || tab === "funcionarios" ? "F" : "A";
      obj.code = nextCode(prefix);
    }
    try {
      await upsert({ data: obj });
      toast.success("Membro salvo");
      setOpen(false); setEditing(null);
      qc.invalidateQueries({ queryKey: ["members"] });
    } catch (err: any) { toast.error(err.message); }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir?")) return;
    try {
      await del({ data: { id } });
      toast.success("Membro excluído");
      qc.invalidateQueries({ queryKey: ["members"] });
    }
    catch (e: any) { toast.error(e.message); }
  }

  const previewCode = editing?.code ?? nextCode(tab === "funcionarios" ? "F" : "A");
  const fields: [string, string][] = [
    ["registration", "Matrícula"], ["full_name", "Nome completo"], ["email", "E-mail"],
    ["phone", "Telefone"], ["member_role", "Função"], ["course", "Curso"], ["grade", "Turma"], ["cpf", "CPF"],
    ["street", "Rua"], ["number", "Número"], ["district", "Bairro"], ["city", "Cidade"], ["state", "UF"],
  ];

  function renderTable(rows: any[], showGrade: boolean) {
    return (
      <Card><CardContent className="p-0">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Código</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">Nome</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">E-mail</th>
                <th className="p-3 font-semibold text-xs uppercase tracking-wider text-muted-foreground">{showGrade ? "Turma" : "Função"}</th>
                <th className="p-3 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((m: any) => (
                <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                  <td className="p-3 font-mono text-xs text-muted-foreground">{m.code}</td>
                  <td className="p-3 font-medium text-foreground">{m.full_name}</td>
                  <td className="p-3 text-muted-foreground">{m.email ?? "—"}</td>
                  <td className="p-3">
                    <span className="text-muted-foreground text-xs">
                      {showGrade ? m.grade : m.member_role} {!showGrade && m.course && <span className="text-muted-foreground/60">· {m.course}</span>}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setOpen(true); }} className="h-7 w-7 p-0"><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(m.id)} className="h-7 w-7 p-0 text-destructive hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Users className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground font-medium">Nenhum {showGrade ? "aluno" : "funcionário"} encontrado</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{search ? "Tente alterar a busca." : "Clique em \"Novo membro\" para adicionar."}</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent></Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-display font-bold tracking-tight">Membros</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{students.length} alunos · {staff.length} funcionários</p>
        </div>
        <Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4 mr-1.5" />Novo membro</Button>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "alunos" | "funcionarios")}>
        <TabsList>
          <TabsTrigger value="alunos">Alunos ({students.length})</TabsTrigger>
          <TabsTrigger value="funcionarios">Funcionários ({staff.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="alunos" className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-48"><SelectValue placeholder="Turma" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as turmas</SelectItem>
                {grades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {renderTable(filteredStudents, true)}
        </TabsContent>

        <TabsContent value="funcionarios" className="space-y-3">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Buscar por nome..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {renderTable(filteredStaff, false)}
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-4 w-4 text-secondary" />{editing ? "Editar membro" : "Novo membro"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label className="text-xs uppercase tracking-wider">Código (automático)</Label>
              <Input value={previewCode} readOnly disabled className="font-mono" />
            </div>
            {fields.map(([n, l]) => (
              <div key={n} className={n === "full_name" ? "col-span-2" : ""}>
                <Label className="text-xs uppercase tracking-wider">{l}</Label>
                <Input name={n} required={n === "full_name"} defaultValue={editing?.[n] ?? ""} />
              </div>
            ))}
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
