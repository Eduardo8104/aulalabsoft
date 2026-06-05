import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Library, BookOpen, Users, Repeat, Shield } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BibliotecaPro — Gestão moderna de bibliotecas escolares" },
      { name: "description", content: "Plataforma completa para gerenciar livros, empréstimos, membros e editoras da sua biblioteca escolar." },
      { property: "og:title", content: "BibliotecaPro" },
      { property: "og:description", content: "Plataforma completa para gerenciar livros, empréstimos, membros e editoras." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Library className="h-5 w-5 text-primary" />
            <span className="font-semibold tracking-tight">BibliotecaPro</span>
          </div>
          <Link to="/login"><Button size="sm">Entrar</Button></Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center animate-fade-in">
        <span className="inline-block text-xs uppercase tracking-widest text-primary mb-6">Gestão de biblioteca escolar</span>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          Sua biblioteca, <span className="text-gradient-primary">organizada</span> de ponta a ponta.
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Controle livros, empréstimos, devoluções, membros e editoras em uma plataforma rápida, moderna e segura.
        </p>
        <div className="mt-10 flex items-center justify-center gap-3">
          <Link to="/login"><Button size="lg">Começar agora</Button></Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 grid md:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, t: "Acervo completo", d: "Catalogação com capa, ISBN, autor e categoria." },
          { icon: Repeat, t: "Empréstimos ágeis", d: "Registre saídas e devoluções com estoque em tempo real." },
          { icon: Users, t: "Membros organizados", d: "Cadastro completo com curso, série e contato." },
          { icon: Shield, t: "Acesso por perfil", d: "Admin, bibliotecário e leitor com permissões claras." },
        ].map((f) => (
          <div key={f.t} className="rounded-lg border border-border bg-card p-5">
            <f.icon className="h-5 w-5 text-primary mb-3" />
            <h3 className="font-semibold text-sm">{f.t}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
