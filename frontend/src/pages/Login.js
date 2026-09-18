import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { School, ShieldCheck, Wallet, GraduationCap, Loader2 } from "lucide-react";

const HERO = "https://images.unsplash.com/photo-1509062522246-3755977927d7?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA4Mzl8MHwxfHNlYXJjaHwxfHxzY2hvb2wlMjBjbGFzc3Jvb20lMjBzdHVkZW50cyUyMGVkdWNhdGlvbnxlbnwwfHx8fDE3ODk3MzIyNzd8MA&ixlib=rb-4.1.0&q=85";

const QUICK = [
  { role: "admin", email: "otepaleon45@gmail.com", pw: "admin123", label: "Administrateur", icon: ShieldCheck, cls: "border-indigo-200 hover:bg-indigo-50 text-indigo-700", testid: "btn-quick-login-admin" },
  { role: "comptable", email: "comptable@scolaretat.cd", pw: "compta123", label: "Comptable", icon: Wallet, cls: "border-emerald-200 hover:bg-emerald-50 text-emerald-700", testid: "btn-quick-login-comptable" },
  { role: "enseignant", email: "enseignant@scolaretat.cd", pw: "prof123", label: "Enseignant", icon: GraduationCap, cls: "border-amber-200 hover:bg-amber-50 text-amber-700", testid: "btn-quick-login-enseignant" },
];

const DEST = { admin: "/admin", comptable: "/comptable", enseignant: "/enseignant" };

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async (em, pw) => {
    setError("");
    setLoading(true);
    try {
      const u = await login(em, pw);
      navigate(DEST[u.role] || "/admin");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-900">
      {/* Left hero */}
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

      {/* Right form */}
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
            <p className="text-sm text-slate-500 mt-1 mb-6">Accédez à votre espace de travail.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                doLogin(email, password);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-medium text-slate-700">Adresse email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="input-login-email"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="vous@ecole.cd"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mot de passe</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  data-testid="input-login-password"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>
              {error && (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2" data-testid="login-error">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                data-testid="btn-login-submit"
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />} Se connecter
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 text-center">Connexion rapide (démo)</p>
              <div className="grid grid-cols-3 gap-2">
                {QUICK.map((q) => (
                  <button
                    key={q.role}
                    onClick={() => doLogin(q.email, q.pw)}
                    data-testid={q.testid}
                    className={`flex flex-col items-center gap-1.5 border rounded-lg py-3 text-xs font-medium bg-white transition-colors ${q.cls}`}
                  >
                    <q.icon className="h-5 w-5" />
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
