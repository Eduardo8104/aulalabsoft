import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { LayoutDashboard, BookOpen, Building2, Users, Repeat, Tag, LogOut, Menu, X, Library, BookMarked, ClipboardList, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { useRole } from "@/hooks/use-role";

const staffNav = [
  { to: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { to: "/books", label: "Livros", icon: BookOpen },
  { to: "/loans", label: "Empréstimos", icon: Repeat },
  { to: "/members", label: "Membros", icon: Users },
  { to: "/publishers", label: "Editoras", icon: Building2 },
  { to: "/categories", label: "Categorias", icon: Tag },
] as const;

const userNav = [
  { to: "/catalog", label: "Catálogo", icon: BookMarked },
  { to: "/my-loans", label: "Meus empréstimos", icon: ClipboardList },
] as const;

const breadcrumbMap: Record<string, string> = {
  "/dashboard": "Painel",
  "/books": "Livros",
  "/loans": "Empréstimos",
  "/members": "Membros",
  "/publishers": "Editoras",
  "/categories": "Categorias",
  "/catalog": "Catálogo",
  "/my-loans": "Meus empréstimos",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { isStaff } = useRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navItems = isStaff ? staffNav : userNav;

  const email = user?.email ?? "";
  const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? email.split("@")[0];
  const initials = name ? name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) : "?";

  const pathParts = location.pathname.split("/").filter(Boolean);
  const showBreadcrumb = location.pathname !== "/dashboard";

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  return (
    <div className="flex min-h-screen bg-background">
      {mobileOpen && <div className="fixed inset-0 z-40 bg-[#0D3B3B]/30 backdrop-blur-sm md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-200",
        mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        {/* Sidebar Header */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center bg-primary">
              <Library className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="gold-divider" />
            <div>
              <span className="text-sm font-semibold text-sidebar-foreground tracking-tight">BibliotecaPro</span>
              <span className="block text-[10px] text-muted-foreground font-body tracking-wider uppercase">Gestão escolar</span>
            </div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="p-1 text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent md:hidden transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 p-4 pt-5 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to || location.pathname.startsWith(item.to + "/");
            return (
              <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all min-h-[44px]",
                  "border-l-2",
                  isActive
                    ? "border-l-secondary bg-accent text-foreground font-semibold"
                    : "border-l-transparent text-muted-foreground hover:bg-accent hover:text-foreground hover:border-l-secondary/30"
                )}>
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Profile Footer */}
        <div className="border-t border-sidebar-border p-5 shrink-0 relative">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-primary/10 text-primary text-xs font-display font-bold cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
              {initials}
            </div>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setProfileOpen(!profileOpen)}>
              <p className="text-xs font-medium text-sidebar-foreground truncate">{name}</p>
              <p className="text-[11px] text-muted-foreground truncate">{email}</p>
            </div>
            <button onClick={handleSignOut} className="shrink-0 p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-colors" title="Sair">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:pl-60">
        {/* Mobile Header */}
        <div className="sticky top-0 z-30 flex h-16 items-center border-b border-border bg-background/90 backdrop-blur-sm px-6 md:hidden">
          <button onClick={() => setMobileOpen(true)} className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-foreground hover:bg-accent transition-colors">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="flex h-7 w-7 items-center justify-center bg-primary">
              <Library className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight">BibliotecaPro</span>
          </div>
        </div>

        {/* Breadcrumbs (desktop) */}
        {showBreadcrumb && (
          <div className="hidden md:flex items-center gap-1.5 px-8 pt-5 pb-0 text-xs text-muted-foreground">
            <Link to="/dashboard" className="hover:text-foreground transition-colors">Painel</Link>
            {pathParts.filter(p => p !== "_authenticated").map((part, i) => {
              const path = "/" + pathParts.slice(0, i + 1).join("/");
              const label = breadcrumbMap[path] || part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, " ");
              return (
                <span key={path} className="flex items-center gap-1.5">
                  <ChevronRight className="h-3 w-3" />
                  <span className="text-foreground font-medium">{label}</span>
                </span>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="mx-auto max-w-7xl px-6 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
