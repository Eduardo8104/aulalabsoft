import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Library, Mail, Lock, Eye, EyeOff, BookOpen, Users, Repeat, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const { signIn, signUp, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate({ to: "/dashboard" });
    }
  }, [isLoading, isAuthenticated, navigate]);

  async function handleGoogleSignIn() {
    setError("");
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        setError(result.error instanceof Error ? result.error.message : String(result.error));
      }
    } catch {
      setError("Failed to sign in with Google");
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isSignUp) {
      const { error } = await signUp(email, password, name);
      if (error) setError(error);
      else setError("Check your email to confirm your account.");
    } else {
      const { error } = await signIn(email, password);
      if (error) setError(error);
      else navigate({ to: "/dashboard" });
    }

    setLoading(false);
  }

  if (isLoading || isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* === LEFT: Decorative Panel === */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.04]" />
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#0D3B3B] to-[#0A2F2F]" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center bg-secondary">
              <Library className="h-4 w-4 text-secondary-foreground" />
            </div>
            <span className="text-sm font-semibold text-white/90">BibliotecaPro</span>
          </div>

          <div className="max-w-md animate-fade-in-up">
            <div className="flex h-16 w-16 items-center justify-center bg-secondary/20 mb-8">
              <Library className="h-8 w-8 text-secondary" />
            </div>
            <h2 className="text-3xl font-display font-bold text-white tracking-tight leading-tight">
              Gerencie sua biblioteca com inteligência
            </h2>
            <p className="text-white/60 mt-4 text-sm leading-relaxed">
              Cadastre livros por ISBN, controle empréstimos em tempo real, organize membros e editoras — tudo em um só lugar.
            </p>

            <div className="mt-10 space-y-5">
              {[
                { icon: BookOpen, text: "Catálogo inteligente com busca automática por ISBN" },
                { icon: Repeat, text: "Empréstimos e devoluções com estoque em tempo real" },
                { icon: Users, text: "Gestão completa de membros com perfis diferenciados" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center bg-white/5">
                    <item.icon className="h-4 w-4 text-secondary" />
                  </div>
                  <span className="text-sm text-white/70">{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-white/30">&copy; {new Date().getFullYear()} BibliotecaPro</p>
        </div>
      </div>

      {/* === RIGHT: Login Form === */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 animate-fade-in">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center justify-center gap-3 mb-10 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center bg-primary">
              <Library className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold text-foreground">BibliotecaPro</span>
          </div>

          <div className="text-center mb-8">
            <div className="hidden lg:flex justify-center mb-6">
              <div className="flex h-12 w-12 items-center justify-center bg-primary">
                <Library className="h-6 w-6 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isSignUp ? "Preencha os dados para começar." : "Entre para acessar sua biblioteca."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm font-medium"
            disabled={googleLoading}
            onClick={handleGoogleSignIn}
          >
            <svg className="mr-2.5 h-4 w-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            {googleLoading ? "Entrando..." : "Continuar com Google"}
          </Button>

          <div className="flex items-center gap-3 my-6">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">ou</span>
            <Separator className="flex-1" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wider font-semibold">Nome completo</Label>
                <div className="relative">
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="h-11 pl-10 text-sm"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-semibold">Email</Label>
              <div className="relative">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@escola.com.br"
                  required
                  className="h-11 pl-10 text-sm"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider font-semibold">Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="h-11 pl-10 pr-10 text-sm"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 px-4 py-3 animate-fade-in">
                <p className="text-xs text-destructive font-medium">{error}</p>
              </div>
            )}

            <Button type="submit" className="w-full h-11 text-sm font-bold" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isSignUp ? "Criando conta..." : "Entrando..."}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  {isSignUp ? "Criar conta" : "Entrar"}
                  <ArrowRight className="h-4 w-4" />
                </span>
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              {isSignUp ? "Já tem uma conta?" : "Não tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError(""); }}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
              >
                {isSignUp ? "Fazer login" : "Cadastre-se"}
              </button>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
