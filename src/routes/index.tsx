import { createFileRoute, Link } from "@tanstack/react-router";
import { Library, BookOpen, Users, Repeat, Shield, ArrowRight, Check, ChevronRight, Quote, Star } from "lucide-react";

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

function StatCounter({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center animate-fade-in-up">
      <p className="text-3xl md:text-4xl font-display font-bold text-primary">{value}</p>
      <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}

function Testimonial({ name, role, text, rating }: { name: string; role: string; text: string; rating: number }) {
  return (
    <div className="relative border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <Quote className="absolute top-6 right-6 h-8 w-8 text-secondary/15" />
      <div className="flex gap-1 mb-4">
        {Array.from({ length: rating }).map((_, i) => (
          <Star key={i} className="h-3.5 w-3.5 fill-secondary text-secondary" />
        ))}
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-6 italic">"{text}"</p>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center bg-primary/10 text-primary text-xs font-display font-bold">
          {name.split(" ").map(n => n[0]).join("")}
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{name}</p>
          <p className="text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background font-body">
      {/* === HEADER === */}
      <header className="relative z-10 mx-auto max-w-7xl px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-primary">
              <Library className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="gold-divider" />
            <span className="text-sm font-semibold tracking-tight text-foreground">BibliotecaPro</span>
          </div>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wider text-foreground hover:text-primary transition-colors uppercase group"
          >
            Entrar
            <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern" />
        <div className="absolute inset-0 bg-gradient-radial" />
        <div className="relative mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-center py-20 md:py-28 animate-fade-in-up">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest text-secondary uppercase mb-8 border border-secondary/20 bg-secondary/5 px-4 py-1.5">
              Gestão de biblioteca escolar
            </span>

            <h1 className="font-display font-bold text-center text-foreground leading-none tracking-tight"
              style={{ fontSize: "clamp(2.5rem, 5vw, 5rem)", lineHeight: 0.9, letterSpacing: "-2px", maxWidth: "900px" }}>
              Sua biblioteca,<br />
              <span className="text-gradient-primary">organizada</span> de ponta<br />
              a ponta.
            </h1>

            <p className="text-muted-foreground text-center max-w-xl mt-10 text-sm leading-relaxed">
              Controle livros, empréstimos, devoluções, membros e editoras em uma plataforma rápida, moderna e segura — pensada para instituições de ensino.
            </p>

            <div className="flex items-center gap-4 mt-10">
              <Link to="/login">
                <button
                  className="relative overflow-hidden group bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wider px-8 py-4 transition-all duration-300 hover:bg-primary/90 active:scale-[0.98]"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Começar agora
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </span>
                </button>
              </Link>
              <Link to="/login">
                <button
                  className="border border-border bg-background text-foreground text-xs font-bold uppercase tracking-wider px-8 py-4 transition-all duration-300 hover:bg-accent active:scale-[0.98]"
                >
                  Ver demonstração
                </button>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-12 pt-8 border-t border-border/50">
              {[
                { value: "500+", label: "Livros catalogados" },
                { value: "200+", label: "Membros ativos" },
                { value: "1k+", label: "Empréstimos realizados" },
                { value: "98%", label: "Satisfação" },
              ].map((s, i) => (
                <StatCounter key={s.label} value={s.value} label={s.label} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === COMO FUNCIONA === */}
      <section className="relative py-20 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="text-xs font-bold tracking-widest text-secondary uppercase">Passo a passo</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3 tracking-tight">
              Como funciona
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-3">
              Em poucos minutos sua biblioteca está no ar. Simples, rápido e seguro.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Cadastre-se", desc: "Crie sua conta em segundos. Configure sua instituição e comece a usar.", icon: Users },
              { step: "02", title: "Adicione seu acervo", desc: "Cadastre livros manualmente ou busque por ISBN. Organize por categoria e editora.", icon: BookOpen },
              { step: "03", title: "Gerencie empréstimos", desc: "Controle saídas, devoluções, renovações e multas em tempo real.", icon: Repeat },
            ].map((s, i) => (
              <div key={s.step} className="relative border border-border bg-card p-8 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg group animate-fade-in-up">
                <span className="text-5xl font-display font-bold text-secondary/10 absolute top-4 right-6">{s.step}</span>
                <div className="flex h-12 w-12 items-center justify-center bg-primary/5 text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-foreground">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section className="py-20 md:py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="text-xs font-bold tracking-widest text-secondary uppercase">Recursos</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3 tracking-tight">
              Tudo que sua biblioteca precisa
            </h2>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto mt-3">
              Uma plataforma completa com ferramentas inteligentes para gestão escolar.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: BookOpen, t: "Acervo completo", d: "Catalogação com capa, ISBN, autor e categoria. Controle total do seu acervo bibliográfico." },
              { icon: Repeat, t: "Empréstimos ágeis", d: "Registre saídas e devoluções com estoque em tempo real. Aprovação e renovação simplificadas." },
              { icon: Users, t: "Membros organizados", d: "Cadastro completo com curso, série e contato. Diferencie alunos e funcionários." },
              { icon: Shield, t: "Acesso por perfil", d: "Admin, bibliotecário e leitor com permissões claras. Segurança e controle em cada nível." },
            ].map((f, i) => (
              <div key={f.t} className="group border border-border bg-card p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg animate-fade-in-up">
                <div className="flex h-11 w-11 items-center justify-center bg-primary/5 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-bold text-base text-foreground">{f.t}</h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === DEPOIMENTOS === */}
      <section className="py-20 md:py-24 bg-muted/30">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center mb-14 animate-fade-in-up">
            <span className="text-xs font-bold tracking-widest text-secondary uppercase">Depoimentos</span>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mt-3 tracking-tight">
              Quem usa recomenda
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Testimonial
              name="Ana Oliveira"
              role="Bibliotecária, Colégio São Paulo"
              text="O BibliotecaPro transformou a gestão da nossa biblioteca. Reduzimos o tempo de empréstimo em 60% e os alunos adoram o catálogo online."
              rating={5}
            />
            <Testimonial
              name="Carlos Mendes"
              role="Coordenador Pedagógico"
              text="Finalmente uma ferramenta que entende as necessidades de uma biblioteca escolar. Simples de usar e muito completa."
              rating={5}
            />
            <Testimonial
              name="Juliana Costa"
              role="Diretora, Instituto Educar"
              text="A funcionalidade de busca por ISBN nos poupa horas de trabalho. O controle de empréstimos é preciso e confiável."
              rating={4}
            />
          </div>
        </div>
      </section>

      {/* === CTA === */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-primary" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 md:py-24">
          <div className="text-center animate-fade-in-up">
            <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground tracking-tight">
              Pronto para transformar sua biblioteca?
            </h2>
            <p className="text-primary-foreground/70 max-w-lg mx-auto mt-4 text-sm">
              Comece gratuitamente hoje. Não precisa de cartão de crédito. Sua biblioteca merece o melhor.
            </p>
            <div className="flex items-center justify-center gap-4 mt-8">
              <Link to="/login">
                <button
                  className="bg-secondary text-secondary-foreground text-xs font-bold uppercase tracking-wider px-8 py-4 transition-all duration-300 hover:bg-secondary/90 active:scale-[0.98] flex items-center gap-2"
                >
                  Começar agora <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
              <Link to="/login">
                <button
                  className="border border-primary-foreground/20 text-primary-foreground text-xs font-bold uppercase tracking-wider px-8 py-4 transition-all duration-300 hover:bg-white/5 active:scale-[0.98]"
                >
                  Falar com vendas
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-7 w-7 items-center justify-center bg-primary">
                  <Library className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
                <span className="gold-divider" />
                <span className="text-sm font-semibold text-foreground">BibliotecaPro</span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                Plataforma completa para gestão de bibliotecas escolares. Moderna, segura e fácil de usar.
              </p>
            </div>
            {[
              { title: "Produto", links: ["Recursos", "Preços", "Depoimentos", "FAQ"] },
              { title: "Suporte", links: ["Central de ajuda", "Documentação", "Status", "Contato"] },
              { title: "Legal", links: ["Privacidade", "Termos", "Cookies", "LGPD"] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-4">{col.title}</h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-xs text-muted-foreground hover:text-foreground transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-10 pt-6 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} BibliotecaPro. Todos os direitos reservados.</p>
            <div className="flex items-center gap-3">
              {["GH", "TW", "LI"].map((s) => (
                <span key={s} className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">{s}</span>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
