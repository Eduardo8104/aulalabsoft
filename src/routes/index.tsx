import { createFileRoute, Link } from "@tanstack/react-router";
import { Library, BookOpen, Users, Repeat, Shield, GraduationCap } from "lucide-react";

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
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      <header className="mx-auto max-w-7xl" style={{ padding: "40px 60px" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-6 w-6 items-center justify-center bg-primary" style={{ borderRadius: 0 }}>
              <Library className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="gold-divider" />
            <span className="text-sm font-semibold tracking-tight text-foreground" style={{ fontFamily: "'Inter', sans-serif", letterSpacing: "0.5px" }}>BibliotecaPro</span>
          </div>
          <Link to="/login" className="text-xs font-bold tracking-wider text-foreground hover:text-primary transition-colors uppercase" style={{ letterSpacing: "1px" }}>
            Entrar
          </Link>
        </div>
      </header>

      <section className="flex flex-col items-center justify-center px-6 animate-fade-in" style={{ paddingTop: "60px", paddingBottom: "100px" }}>
        <span className="text-xs font-bold tracking-widest text-primary uppercase" style={{ marginBottom: "30px", letterSpacing: "2px" }}>
          Gestão de biblioteca escolar
        </span>

        <h1 className="font-display font-bold text-center text-foreground leading-none tracking-tight" style={{
          fontSize: "clamp(2.5rem, 5vw, 5rem)",
          lineHeight: 0.9,
          letterSpacing: "-2px",
          maxWidth: "900px"
        }}>
          Sua biblioteca,<br />
          <span className="text-gradient-primary">organizada</span> de ponta<br />
          a ponta.
        </h1>

        <p className="text-muted-foreground text-center max-w-xl" style={{
          marginTop: "40px",
          fontSize: "14px",
          lineHeight: "1.8",
          fontFamily: "'Inter', sans-serif"
        }}>
          Controle livros, empréstimos, devoluções, membros e editoras em uma plataforma rápida, moderna e segura — pensada para instituições de ensino.
        </p>

        <div style={{ marginTop: "40px" }}>
          <Link to="/login">
            <button style={{
              padding: "18px 45px",
              background: "#0D3B3B",
              color: "white",
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "1px",
              border: "none",
              cursor: "pointer",
              fontFamily: "'Inter', sans-serif",
              textTransform: "uppercase"
            }}
            className="hover:-translate-y-0.5 transition-transform duration-200">
              Começar agora
            </button>
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { icon: BookOpen, t: "Acervo completo", d: "Catalogação com capa, ISBN, autor e categoria. Controle total do seu acervo bibliográfico." },
            { icon: Repeat, t: "Empréstimos ágeis", d: "Registre saídas e devoluções com estoque em tempo real. Aprovação e renovação simplificadas." },
            { icon: Users, t: "Membros organizados", d: "Cadastro completo com curso, série e contato. Diferencie alunos e funcionários." },
            { icon: Shield, t: "Acesso por perfil", d: "Admin, bibliotecário e leitor com permissões claras. Segurança e controle em cada nível." },
          ].map((f) => (
            <div key={f.t} className="group border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg" style={{ borderRadius: 0 }}>
              <div className="flex h-10 w-10 items-center justify-center bg-primary/5 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300" style={{ borderRadius: 0 }}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display font-bold text-base text-foreground">{f.t}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border" style={{ borderRadius: 0 }}>
        <div className="mx-auto max-w-7xl px-6 py-8 flex items-center justify-between" style={{ padding: "24px 60px" }}>
          <div className="flex items-center gap-2">
            <Library className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">BibliotecaPro</span>
          </div>
          <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BibliotecaPro. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
