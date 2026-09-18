import { useEffect, useState, useCallback } from "react";
import { useTab } from "@/hooks/useTab";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import BulletinModal from "@/components/BulletinModal";
import SettingsPanel from "@/components/SettingsPanel";
import api, { money, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  Users, GraduationCap, DollarSign, TrendingDown, Scale, Wallet,
  AlertCircle, Calculator, Award, ShieldCheck, PlusCircle, Trash2,
  CheckCircle2, Loader2, Pencil, Settings,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TABS = [
  { key: "vue", label: "Tableau de bord" },
  { key: "inventaire", label: "Inventaire financier" },
  { key: "resultats", label: "Résultats scolaires" },
  { key: "reclamations", label: "Réclamations" },
  { key: "utilisateurs", label: "Utilisateurs" },
  { key: "parametres", label: "Paramètres" },
];

export default function AdminDashboard() {
  const [tab, setTab] = useTab("vue");
  const [stats, setStats] = useState(null);
  const [bulletin, setBulletin] = useState(null);

  const load = useCallback(async () => {
    const { data } = await api.get("/dashboard/admin");
    setStats(data);
  }, []);
  useEffect(() => { load().catch((e) => toast.error(formatApiError(e.response?.data?.detail))); }, [load]);

  return (
    <Layout title="Administration Générale" subtitle="Pilotage global de l'établissement">
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-indigo-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "vue" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total élèves" value={stats.total_eleves} sub={`${stats.inscrits} inscrits · ${stats.actifs} actifs`} accent="indigo" testid="stat-eleves" />
            <StatCard icon={GraduationCap} label="Classes" value={stats.total_classes} sub={`${stats.pre_inscrits} pré-inscrits`} accent="blue" testid="stat-classes" />
            <StatCard icon={DollarSign} label="Recettes" value={money(stats.recettes)} accent="emerald" testid="stat-recettes" />
            <StatCard icon={TrendingDown} label="Dépenses" value={money(stats.depenses)} accent="rose" testid="stat-depenses" />
            <StatCard icon={Scale} label="Solde net" value={money(stats.solde_net)} accent="indigo" testid="stat-solde" />
            <StatCard icon={Wallet} label="Dettes élèves" value={money(stats.dettes_eleves)} accent="amber" testid="stat-dettes-eleves" />
            <StatCard icon={Calculator} label="Dettes enseignants" value={money(stats.dettes_enseignants)} accent="amber" testid="stat-dettes-profs" />
            <StatCard icon={AlertCircle} label="Réclamations" value={stats.reclamations_ouvertes} sub="ouvertes" accent="rose" testid="stat-reclamations" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-display font-semibold text-slate-800 mb-4">Situation financière</h3>
            <FinanceBars recettes={stats.recettes} depenses={stats.depenses} dettes={stats.dettes_eleves} />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden" data-testid="recent-payments">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-display font-semibold text-slate-800">Derniers paiements reçus</h3>
              <button onClick={() => setTab("parametres")} data-testid="btn-goto-settings" className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900"><Settings className="h-4 w-4" /> Paramètres</button>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left px-6 py-2">Élève</th><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Détail</th><th className="text-right px-6 py-2">Montant</th></tr></thead>
              <tbody>
                {stats.derniers_paiements.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-6 py-2.5 font-medium text-slate-800">{p.student_name}</td>
                    <td className="px-4 py-2.5 text-slate-500">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-600">{(p.allocations || []).map((a) => <span key={a.category} className="inline-block mr-2 bg-slate-100 rounded px-1.5 py-0.5">{a.category.toUpperCase()}: {money(a.amount)}</span>)}</td>
                    <td className="px-6 py-2.5 text-right font-mono font-medium text-emerald-700">{money(p.total_amount)}</td>
                  </tr>
                ))}
                {stats.derniers_paiements.length === 0 && <tr><td colSpan={4} className="px-6 py-6 text-center text-slate-400">Aucun paiement enregistré</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "inventaire" && <InventoryPanel reloadStats={load} />}
      {tab === "resultats" && <ResultsPanel onOpen={setBulletin} />}
      {tab === "reclamations" && <ReclamationsPanel reloadStats={load} />}
      {tab === "utilisateurs" && <UsersPanel />}
      {tab === "parametres" && <SettingsPanel />}

      <BulletinModal bulletin={bulletin} open={!!bulletin} onClose={() => setBulletin(null)} />
    </Layout>
  );
}

function FinanceBars({ recettes, depenses, dettes }) {
  const max = Math.max(recettes, depenses, dettes, 1);
  const rows = [
    ["Recettes", recettes, "bg-emerald-500"],
    ["Dépenses", depenses, "bg-rose-500"],
    ["Dettes élèves", dettes, "bg-amber-500"],
  ];
  return (
    <div className="space-y-4">
      {rows.map(([label, val, color]) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1"><span className="text-slate-600">{label}</span><span className="font-mono font-medium text-slate-900">{money(val)}</span></div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${(val / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

function InventoryPanel({ reloadStats }) {
  const [inv, setInv] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const load = useCallback(async () => { const { data } = await api.get("/inventory"); setInv(data); }, []);
  useEffect(() => { load(); }, [load]);
  if (!inv) return <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />;
  return (
    <div className="space-y-4" data-testid="admin-inventory-calculator">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={Calculator} label="Masse salariale annuelle" value={money(inv.masse_salariale_annuelle)} accent="indigo" />
        <StatCard icon={CheckCircle2} label="Total payé" value={money(inv.total_paye)} accent="emerald" />
        <StatCard icon={Wallet} label="Reste à décaisser" value={money(inv.reste_a_payer)} accent="amber" />
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Enseignant</th><th className="text-right px-4 py-3">Salaire</th><th className="text-right px-4 py-3">Dû annuel</th><th className="text-right px-4 py-3">Payé</th><th className="text-right px-4 py-3">Reste</th><th className="text-right px-4 py-3">Action</th></tr>
          </thead>
          <tbody>
            {inv.rows.map((r) => (
              <tr key={r.teacher_id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{r.name}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{money(r.salaire ?? r.salaire_trimestre)} <span className="text-xs text-slate-400">/ {r.periode === "mois" ? "mois" : "trim."}</span></td>
                <td className="px-4 py-3 text-right font-mono text-slate-600">{money(r.du_annuel)}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-700">{money(r.paye)}</td>
                <td className={`px-4 py-3 text-right font-mono font-semibold ${r.reste > 0 ? "text-rose-600" : "text-emerald-600"}`}>{money(r.reste)}</td>
                <td className="px-4 py-3 text-right whitespace-nowrap"><button onClick={() => setPayFor(r)} data-testid={`btn-pay-teacher-${r.teacher_id}`} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-md text-xs font-semibold"><DollarSign className="h-3.5 w-3.5" /> Payer</button>
                  <button onClick={async () => { if (!window.confirm(`Supprimer l'enseignant ${r.name} ?`)) return; try { await api.delete(`/users/${r.teacher_id}`); toast.success("Enseignant supprimé"); load(); reloadStats(); } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); } }} data-testid={`btn-delete-teacher-${r.teacher_id}`} className="ml-2 text-slate-400 hover:text-rose-600 align-middle" title="Supprimer"><Trash2 className="h-4 w-4 inline" /></button></td>
              </tr>
            ))}
            {inv.rows.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun enseignant enregistré</td></tr>}
          </tbody>
        </table>
      </div>
      <PayTeacherDialog teacher={payFor} onClose={() => setPayFor(null)} onPaid={() => { load(); reloadStats(); }} />
    </div>
  );
}

function PayTeacherDialog({ teacher, onClose, onPaid }) {
  const [amount, setAmount] = useState("");
  const [trimestre, setTrimestre] = useState(1);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (teacher) setAmount(""); }, [teacher]);
  const submit = async () => {
    if (!amount || parseFloat(amount) <= 0) { toast.error("Montant invalide"); return; }
    setSaving(true);
    try {
      await api.post("/teacher-payments", { teacher_id: teacher.teacher_id, amount: parseFloat(amount), trimestre });
      toast.success("Honoraire payé"); onClose(); onPaid();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={!!teacher} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm bg-white">
        <DialogHeader><DialogTitle className="font-display">Paiement honoraire</DialogTitle><p className="text-sm text-slate-500">{teacher?.name} · reste {money(teacher?.reste)}</p></DialogHeader>
        <label className="block"><span className="text-xs font-medium text-slate-600">Trimestre</span>
          <select className="fld mt-1" value={trimestre} onChange={(e) => setTrimestre(parseInt(e.target.value))}>{[1, 2, 3].map((t) => <option key={t} value={t}>Trimestre {t}</option>)}</select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Montant ($)</span>
          <input type="number" className="fld mt-1" value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="input-teacher-payment" /></label>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving} data-testid="btn-confirm-teacher-payment" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Confirmer</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResultsPanel({ onOpen }) {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState("");
  const [trimestre, setTrimestre] = useState(1);
  const [res, setRes] = useState(null);
  useEffect(() => { api.get("/classes").then((r) => { setClasses(r.data); if (r.data.length) setClassId(r.data[0].id); }); }, []);
  const load = useCallback(async () => {
    if (!classId) return;
    const { data } = await api.get(`/results?class_id=${classId}&trimestre=${trimestre}`);
    setRes(data);
  }, [classId, trimestre]);
  useEffect(() => { load(); }, [load]);

  const openBulletin = async (sid) => {
    try { const { data } = await api.get(`/bulletin/${sid}?trimestre=${trimestre}`); onOpen(data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block"><span className="text-xs font-medium text-slate-600">Classe & Section</span>
          <select className="fld mt-1 min-w-[220px]" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="select-class-filter">
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.section}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Trimestre</span>
          <select className="fld mt-1" value={trimestre} onChange={(e) => setTrimestre(parseInt(e.target.value))} data-testid="select-trimestre-filter">{[1, 2, 3].map((t) => <option key={t} value={t}>Trimestre {t}</option>)}</select></label>
      </div>
      {res && (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <StatCard icon={Award} label="Moyenne de classe" value={res.moyenne_classe != null ? `${res.moyenne_classe.toFixed(2)}/20` : "—"} accent="indigo" />
            <StatCard icon={CheckCircle2} label="Taux de réussite" value={res.taux_reussite != null ? `${res.taux_reussite}%` : "—"} accent="emerald" />
          </div>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr><th className="text-left px-4 py-3">Rang</th><th className="text-left px-4 py-3">Élève</th><th className="text-right px-4 py-3">Moyenne</th><th className="text-right px-4 py-3">%</th><th className="text-left px-4 py-3 pl-6">Mention</th><th className="text-right px-4 py-3">Bulletin</th></tr>
              </thead>
              <tbody>
                {res.rows.map((r) => (
                  <tr key={r.student_id} className="border-t border-slate-100">
                    <td className="px-4 py-3 font-mono text-slate-500">{r.rang || "—"}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{r.nom}</td>
                    <td className={`px-4 py-3 text-right font-mono font-semibold ${r.moyenne == null ? "text-slate-300" : r.moyenne >= 10 ? "text-emerald-700" : "text-rose-600"}`}>{r.moyenne == null ? "—" : r.moyenne.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{r.pourcentage != null ? `${r.pourcentage}%` : "—"}</td>
                    <td className="px-4 py-3 pl-6 text-slate-600">{r.mention}</td>
                    <td className="px-4 py-3 text-right"><button onClick={() => openBulletin(r.student_id)} data-testid={`btn-admin-bulletin-${r.student_id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-semibold"><Award className="h-3.5 w-3.5" /> Voir</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ReclamationsPanel({ reloadStats }) {
  const [items, setItems] = useState([]);
  const load = useCallback(async () => { const { data } = await api.get("/reclamations"); setItems(data); }, []);
  useEffect(() => { load(); }, [load]);
  const resolve = async (id) => { await api.post(`/reclamations/${id}/resolve`); toast.success("Réclamation résolue"); load(); reloadStats(); };
  const PRIO = { haute: "bg-rose-100 text-rose-800", moyenne: "bg-amber-100 text-amber-800", basse: "bg-slate-100 text-slate-700" };
  return (
    <div className="space-y-3">
      {items.map((r) => (
        <div key={r.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-start gap-4" data-testid={`reclamation-${r.id}`}>
          <div className={`h-9 w-9 rounded-lg grid place-items-center ${r.status === "resolue" ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}><AlertCircle className="h-5 w-5" /></div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap"><span className="font-semibold text-slate-900">{r.sujet}</span><span className={`px-2 py-0.5 rounded text-[11px] font-medium ${PRIO[r.priorite] || PRIO.basse}`}>{r.priorite}</span>{r.status === "resolue" && <span className="px-2 py-0.5 rounded text-[11px] bg-emerald-100 text-emerald-800">résolue</span>}</div>
            <p className="text-sm text-slate-600 mt-0.5">{r.message}</p>
            <p className="text-xs text-slate-400 mt-1">Élève: {r.student_name} · {new Date(r.date).toLocaleDateString("fr-FR")}</p>
          </div>
          {r.status !== "resolue" && <button onClick={() => resolve(r.id)} data-testid={`btn-resolve-${r.id}`} className="shrink-0 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-semibold"><CheckCircle2 className="h-3.5 w-3.5" /> Résoudre</button>}
        </div>
      ))}
      {items.length === 0 && <p className="text-slate-400 text-sm">Aucune réclamation.</p>}
    </div>
  );
}

function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "comptable", access_code: "", salaire_trimestre: 0 });
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { const { data } = await api.get("/users"); setUsers(data); }, []);
  useEffect(() => { load(); }, [load]);
  const ROLE = { admin: "bg-indigo-50 text-indigo-700", comptable: "bg-emerald-50 text-emerald-700", enseignant: "bg-amber-50 text-amber-700" };

  const submit = async () => {
    if (!form.name || !form.email || !form.password) { toast.error("Champs requis manquants"); return; }
    setSaving(true);
    try {
      await api.post("/users", { ...form, salaire_trimestre: parseFloat(form.salaire_trimestre) || 0 });
      toast.success("Utilisateur créé"); setOpen(false); setForm({ name: "", email: "", password: "", role: "comptable", access_code: "", salaire_trimestre: 0 }); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const del = async (id) => { if (!window.confirm("Supprimer cet utilisateur ?")) return; await api.delete(`/users/${id}`); load(); };
  const [edit, setEdit] = useState(null);
  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/users/${edit.id}`, { name: edit.name, access_code: edit.access_code ?? "", password: edit.password || null, salaire_trimestre: parseFloat(edit.salaire_trimestre) || 0 });
      toast.success("Compte mis à jour"); setEdit(null); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display font-bold text-lg text-slate-900">Comptes utilisateurs</h2>
        <button onClick={() => setOpen(true)} data-testid="btn-add-user" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><PlusCircle className="h-4 w-4" /> Nouvel utilisateur</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Rôle</th><th className="text-left px-4 py-3">Code</th><th className="text-right px-4 py-3">Action</th></tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-medium text-slate-800">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded text-xs font-medium ${ROLE[u.role]}`}>{u.role}</span></td>
                <td className="px-4 py-3 font-mono text-slate-600" data-testid={`user-code-${u.id}`}>{u.role === "comptable" ? "—" : (u.access_code || <span className="text-rose-500 text-xs">non défini</span>)}</td>
                <td className="px-4 py-3 text-right space-x-3">
                  <button onClick={() => setEdit({ ...u, password: "" })} data-testid={`btn-edit-user-${u.id}`} className="text-slate-400 hover:text-indigo-600" title="Modifier"><Pencil className="h-4 w-4" /></button>
                  {u.role !== "admin" && <button onClick={() => del(u.id)} className="text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="font-display">Nouvel utilisateur</DialogTitle></DialogHeader>
          <label className="block"><span className="text-xs font-medium text-slate-600">Nom complet</span><input className="fld mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-user-name" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Email</span><input className="fld mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-user-email" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Mot de passe</span><input className="fld mt-1" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="input-user-password" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Rôle</span>
            <select className="fld mt-1" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} data-testid="select-user-role"><option value="comptable">Comptable</option><option value="enseignant">Enseignant</option><option value="admin">Administrateur</option></select></label>
          {form.role !== "comptable" && (
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="text-xs font-medium text-slate-600">Code d'accès (4 chiffres)</span><input className="fld mt-1 font-mono" maxLength={4} value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value.replace(/\D/g, "") })} data-testid="input-user-code" /></label>
              {form.role === "enseignant" && <label className="block"><span className="text-xs font-medium text-slate-600">Salaire/trimestre ($)</span><input type="number" className="fld mt-1" value={form.salaire_trimestre} onChange={(e) => setForm({ ...form, salaire_trimestre: e.target.value })} /></label>}
            </div>
          )}
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
            <button onClick={submit} disabled={saving} data-testid="btn-save-user" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Créer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="font-display">Modifier le compte</DialogTitle></DialogHeader>
          {edit && (
            <>
              <label className="block"><span className="text-xs font-medium text-slate-600">Nom complet</span><input className="fld mt-1" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} data-testid="input-edit-name" /></label>
              {edit.role !== "comptable" && (
                <label className="block"><span className="text-xs font-medium text-slate-600">Code d'accès (4 chiffres)</span>
                  <input className="fld mt-1 font-mono tracking-widest" maxLength={4} value={edit.access_code || ""} onChange={(e) => setEdit({ ...edit, access_code: e.target.value.replace(/\D/g, "") })} data-testid="input-edit-code" /></label>
              )}
              {edit.role === "enseignant" && (
                <label className="block"><span className="text-xs font-medium text-slate-600">Salaire/trimestre ($)</span><input type="number" className="fld mt-1" value={edit.salaire_trimestre ?? 0} onChange={(e) => setEdit({ ...edit, salaire_trimestre: e.target.value })} data-testid="input-edit-salaire" /></label>
              )}
              <label className="block"><span className="text-xs font-medium text-slate-600">Nouveau mot de passe (optionnel)</span><input type="password" className="fld mt-1" value={edit.password} onChange={(e) => setEdit({ ...edit, password: e.target.value })} data-testid="input-edit-password" /></label>
            </>
          )}
          <DialogFooter>
            <button onClick={() => setEdit(null)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
            <button onClick={saveEdit} disabled={saving} data-testid="btn-save-edit-user" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
