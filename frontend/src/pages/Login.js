import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { School, ShieldCheck, Wallet, GraduationCap, Loader2, ArrowLeft, KeyRound } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBjbGFzc3Jvb20lMjBzdHVkZW50cyUyMGVkdWNhdGlvbnxlbnwwfHx8fDE3ODk3MzIyNzd8MA&ixlib=rb-4.1.0&q=85";

const ROLES = [
  { role: "admin", label: "Administrateur", icon: ShieldCheck, needCode: true, cls: "border-indigo-200 hover:bg-indigo-50 text-indigo-700", btn: "bg-indigo-600 hover:bg-indigo-700", testid: "btn-quick-login-admin" },
  { role: "comptable", label: "Comptable", icon: Wallet, needCode: false, cls: "border-emerald-200 hover:bg-emerald-50 text-emerald-700", btn: "bg-emerald-600 hover:bg-emerald-700", testid: "btn-quick-login-comptable" },
  { role: "enseignant", label: "Enseignant", icon: GraduationCap, needCode: true, cls: "border-amber-200 hover:bg-amber-50 text-amber-700", btn: "bg-amber-600 hover:bg-amber-700", testid: "btn-quick-login-enseignant" },
];

const DEST = { admin: "/admin", comptable: "/comptable", enseignant: "/enseignant" };

export default function Login() {
  const { roleLogin } = useAuth();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (role, pin) => {
    setError("");
    setLoading(true);
    try {
      const u = await roleLogin(role, pin);
      navigate(DEST[u.role] || "/admin");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  const pick = (r) => {
    setError("");
    if (r.needCode) { setSelected(r); setCode(""); }
    else doLogin(r.role);
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      <div className="hidden lg:flex w-[45%] relative">
        <img src={HERO} alt="École" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-indigo-950/80 to-indigo-900/40" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-indigo-600 grid place-items-center">
              <School className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-2xl font-extrabold">ScolarEtat</div>
              <div className="text-xs text-indigo-200 uppercase tracking-widest">Gestion Scolaire d'État</div>
            </div>
          </div>
          <div>
            <h2 className="font-display text-4xl font-bold leading-tight mb-4">
              L'excellence administrative<br />au service de l'éducation.
            </h2>
            <p className="text-indigo-200 max-w-md">
              Inscriptions, finances, cotations et bulletins officiels — un système unique
              pour l'Administrateur, le Comptable et l'Enseignant.
            </p>
          </div>
          <p className="text-xs text-indigo-300">Lycée d'État Général Lumumba · Année 2025-2026</p>
        </div>
      </div>

      <div className="flex-1 grid place-items-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="lg:hidden flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 grid place-items-center">
                <School className="h-5 w-5 text-white" />
              </div>
              <span className="font-display text-xl font-extrabold text-slate-900">ScolarEtat</span>
            </div>
            <h1 className="font-display text-2xl font-bold text-slate-900">Connexion</h1>
            <p className="text-sm text-slate-500 mt-1 mb-6">Choisissez votre espace de travail.</p>

            {!selected ? (
              <div className="grid grid-cols-3 gap-3">
                {ROLES.map((r) => (
                  <button
                    key={r.role}
                    onClick={() => pick(r)}
                    disabled={loading}
                    data-testid={r.testid}
                    className={`flex flex-col items-center gap-2 border rounded-xl py-5 text-sm font-semibold bg-white transition-colors disabled:opacity-60 ${r.cls}`}
                  >
                    {loading && r.role === "comptable" ? <Loader2 className="h-6 w-6 animate-spin" /> : <r.icon className="h-6 w-6" />}
                    {r.label}
                  </button>
                ))}
              </div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); doLogin(selected.role, code); }}
                className="space-y-4"
                data-testid="code-form"
              >
                <button type="button" onClick={() => setSelected(null)} data-testid="btn-code-back"
                  className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800">
                  <ArrowLeft className="h-4 w-4" /> Retour
                </button>
                <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${selected.cls}`}>
                  <selected.icon className="h-6 w-6" />
                  <span className="font-semibold">{selected.label}</span>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                    <KeyRound className="h-4 w-4" /> Code d'accès (4 chiffres)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    data-testid="input-access-code"
                    autoFocus
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-2xl tracking-[0.6em] font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    placeholder="••••"
                    required
                  />
                </div>
                {error && (
                  <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>
                )}
                <button type="submit" disabled={loading || code.length !== 4} data-testid="btn-login-submit"
                  className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60 ${selected.btn}`}>
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />} Entrer
                </button>
              </form>
            )}
            {!selected && error && (
              <div className="mt-4 text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">{error}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
