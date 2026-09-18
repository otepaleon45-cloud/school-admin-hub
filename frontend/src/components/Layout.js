import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/hooks/useSettings";
import {
  LayoutDashboard, Users, Wallet, GraduationCap, ShieldCheck, LogOut,
  Menu, X, Receipt, BookOpen, AlertCircle, DollarSign, ArrowLeft,
} from "lucide-react";

const ROLE_META = {
  admin: { label: "Administrateur", badge: "bg-indigo-50 text-indigo-700 border-indigo-200" },
  comptable: { label: "Comptable", badge: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  enseignant: { label: "Enseignant", badge: "bg-amber-50 text-amber-800 border-amber-200" },
};

const NAV = {
  admin: [
    { to: "/admin", icon: LayoutDashboard, label: "Tableau de bord", testid: "role-nav-admin" },
    { to: "/comptable", icon: Wallet, label: "Finance & Élèves", testid: "role-nav-comptable" },
    { to: "/enseignant", icon: GraduationCap, label: "Pédagogie", testid: "role-nav-enseignant" },
  ],
  comptable: [
    { to: "/comptable", icon: Wallet, label: "Finance & Élèves", testid: "role-nav-comptable" },
  ],
  enseignant: [
    { to: "/enseignant", icon: GraduationCap, label: "Espace Enseignant", testid: "role-nav-enseignant" },
  ],
};

export default function Layout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const settings = useSettings();
  const meta = ROLE_META[user?.role] || {};
  const nav = NAV[user?.role] || [];

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex bg-slate-100">
      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-40 h-screen w-64 shrink-0 bg-slate-900 text-slate-200 border-r border-slate-800 flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        data-testid="app-sidebar"
      >
        <div className="h-16 flex items-center gap-3 px-5 border-b border-slate-800">
          <div className="h-9 w-9 rounded-lg bg-white grid place-items-center overflow-hidden">
            <img src="/logo.png" alt="Logo" className="h-8 w-8 object-contain" />
          </div>
          <div className="leading-tight">
            <div className="font-display font-extrabold text-white text-lg">{settings.sigle || "C.S.J.G.L"}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{settings.sigle} {settings.ville}</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <p className="px-3 pb-2 text-[10px] uppercase tracking-widest text-slate-500">Navigation</p>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              data-testid={n.testid}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`
              }
            >
              <n.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-9 w-9 rounded-full bg-slate-700 grid place-items-center text-sm font-semibold text-white">
              {user?.name?.[0] || "U"}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-white truncate">{user?.name}</div>
              <div className="text-[11px] text-slate-400 truncate">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            data-testid="btn-logout"
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" /> Déconnexion
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 flex items-center gap-4 px-4 sm:px-6">
          <button className="lg:hidden" onClick={() => setOpen(true)} data-testid="btn-open-sidebar">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
            data-testid="btn-back"
            title="Retour"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium transition-colors shrink-0"
          >
            <ArrowLeft className="h-4 w-4" /> <span className="hidden sm:inline">Retour</span>
          </button>
          <div className="min-w-0">
            <h1 className="font-display font-bold text-lg sm:text-xl text-slate-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-slate-500 font-medium">Année {settings.annee_scolaire}</span>
            <span className={`px-3 py-1 rounded-full border text-xs font-semibold ${meta.badge}`} data-testid="role-badge">
              {meta.label}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

export { ROLE_META };
