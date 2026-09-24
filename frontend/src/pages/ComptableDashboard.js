import { useEffect, useState, useCallback } from "react";
import { useTab } from "@/hooks/useTab";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import ReceiptModal from "@/components/ReceiptModal";
import ClassFeesPanel from "@/components/ClassFeesPanel";
import TeachersPanel from "@/components/TeachersPanel";
import api, { money, formatApiError, MONTH_LABELS } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import {
  Users, DollarSign, TrendingDown, Scale, PlusCircle, Receipt, Trash2,
  Wallet, UserPlus, Loader2, Printer,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_BADGE = {
  pre_inscrit: "bg-slate-100 text-slate-700",
  inscrit: "bg-blue-100 text-blue-800",
  actif: "bg-emerald-100 text-emerald-800",
  suspendu: "bg-rose-100 text-rose-800",
};
const STATUS_LABEL = { pre_inscrit: "Pré-inscrit", inscrit: "Inscrit", actif: "Actif", suspendu: "Suspendu" };

const TABS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "eleves", label: "Élèves & Inscriptions" },
  { key: "guichet", label: "Guichet & Reçus" },
  { key: "dettes", label: "Dettes par mois" },
  { key: "depenses", label: "Recettes & Dépenses" },
  { key: "frais", label: "Frais par classe" },
  { key: "enseignants", label: "Enseignants" },
];

const FEE_LABEL = MONTH_LABELS;

export default function ComptableDashboard() {
  const [tab, setTab] = useTab("vue");
  const settings = useSettings();
  const taux = Number(settings.taux_change) || 2800;
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [feeCats, setFeeCats] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [payStudent, setPayStudent] = useState(null);
  const [receipt, setReceipt] = useState(null);

  const load = useCallback(async () => {
    const [s, st, cl, pay, exp, fc] = await Promise.all([
      api.get("/dashboard/comptable"),
      api.get("/students"),
      api.get("/classes"),
      api.get("/payments"),
      api.get("/expenses"),
      api.get("/fee-categories"),
    ]);
    setStats(s.data); setStudents(st.data); setClasses(cl.data);
    setPayments(pay.data); setExpenses(exp.data); setFeeCats(fc.data);
  }, []);

  useEffect(() => { load().catch((e) => toast.error(formatApiError(e.response?.data?.detail))); }, [load]);

  const className = (id) => {
    const c = classes.find((x) => x.id === id);
    return c ? `${c.name} ${c.section}` : "—";
  };

  return (
    <Layout title="Espace Comptable" subtitle="Inscriptions, paiements et finances de l'établissement">
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            data-testid={`tab-${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-emerald-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "vue" && stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Users} label="Total élèves" value={stats.total_eleves} sub={`${stats.pre_inscrits} pré-inscrits`} accent="blue" testid="stat-total-eleves" />
          <StatCard icon={DollarSign} label="Recettes" value={money(stats.recettes)} accent="emerald" testid="stat-recettes" />
          <StatCard icon={TrendingDown} label="Dépenses" value={money(stats.depenses)} accent="rose" testid="stat-depenses" />
          <StatCard icon={Scale} label="Solde net" value={money(stats.solde_net)} sub={`${stats.nb_paiements} paiements`} accent="indigo" testid="stat-solde" />
          <StatCard icon={Wallet} label="Dettes élèves" value={money(stats.dettes_eleves)} accent="amber" testid="stat-dettes" />
        </div>
      )}

      {tab === "eleves" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-display font-bold text-lg text-slate-900">Gestion administrative des élèves</h2>
            <button onClick={() => setAddOpen(true)} data-testid="btn-add-student" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
              <UserPlus className="h-4 w-4" /> Ajouter un élève
            </button>
          </div>
          <StudentsTable students={students} className={className} onPay={setPayStudent} onDelete={async (s) => {
            if (!window.confirm(`Supprimer l'élève ${s.nom} ${s.postnom || ""} ? Ses paiements seront aussi supprimés.`)) return;
            try { await api.delete(`/students/${s.id}`); toast.success("Élève supprimé"); load(); }
            catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
          }} statusBadge />
        </div>
      )}

      {tab === "guichet" && (
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900 mb-4">Historique des paiements & reçus</h2>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="text-left px-4 py-3">N° Quittance</th>
                  <th className="text-left px-4 py-3">Élève</th>
                  <th className="text-left px-4 py-3">Date</th>
                  <th className="text-left px-4 py-3">Détail</th>
                  <th className="text-right px-4 py-3">Montant</th>
                  <th className="text-right px-4 py-3">Reçu</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100" data-testid={`payment-row-${p.id}`}>
                    <td className="px-4 py-3 font-mono text-slate-800">{p.receipt_no}</td>
                    <td className="px-4 py-3 text-slate-700">{p.student_name}</td>
                    <td className="px-4 py-3 text-slate-500">{new Date(p.date).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {(p.allocations || []).map((a) => <span key={a.category} className="inline-block mr-2 bg-slate-100 rounded px-1.5 py-0.5">{FEE_LABEL[a.category] || a.category}: {money(a.amount, p.currency)}</span>)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-700">{money(p.total_amount, p.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => openReceipt(p.id, setReceipt)} data-testid={`btn-view-receipt-${p.id}`} className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 text-xs font-medium">
                        <Printer className="h-4 w-4" /> Imprimer
                      </button>
                    </td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun paiement enregistré</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "depenses" && (
        <ExpensesPanel expenses={expenses} reload={load} recettes={stats?.recettes} depenses={stats?.depenses} />
      )}

      {tab === "dettes" && <DebtsPanel students={students} classes={classes} className={className} />}
      {tab === "frais" && <ClassFeesPanel classes={classes} reload={load} />}
      {tab === "enseignants" && <TeachersPanel />}

      <AddStudentDialog open={addOpen} onClose={() => setAddOpen(false)} classes={classes} onSaved={load} />
      <PaymentDialog student={payStudent} taux={taux} onClose={() => setPayStudent(null)} onPaid={(r) => { setReceipt(r); load(); }} />
      <ReceiptModal receipt={receipt} open={!!receipt} onClose={() => setReceipt(null)} />
    </Layout>
  );
}

async function openReceipt(id, setReceipt) {
  try {
    const { data } = await api.get(`/receipts/${id}`);
    setReceipt(data);
  } catch (e) {
    toast.error(formatApiError(e.response?.data?.detail));
  }
}

export function StudentsTable({ students, className, onPay, onDelete, statusBadge }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
          <tr>
            <th className="text-left px-4 py-3">Matricule</th>
            <th className="text-left px-4 py-3">Nom complet</th>
            <th className="text-left px-4 py-3">Classe</th>
            <th className="text-left px-4 py-3">Statut</th>
            <th className="text-right px-4 py-3">Dette</th>
            {onPay && <th className="text-right px-4 py-3">Action</th>}
          </tr>
        </thead>
        <tbody>
          {students.map((s) => (
            <tr key={s.id} className="border-t border-slate-100" data-testid={`student-row-${s.id}`}>
              <td className="px-4 py-3 font-mono text-slate-600">{s.matricule}</td>
              <td className="px-4 py-3 font-medium text-slate-800">{s.nom} {s.postnom} {s.prenom}</td>
              <td className="px-4 py-3 text-slate-600">{className(s.class_id)}</td>
              <td className="px-4 py-3">
                {statusBadge && <span className={`px-2 py-1 rounded-md text-xs font-medium ${STATUS_BADGE[s.status] || "bg-slate-100"}`}>{STATUS_LABEL[s.status] || s.status}</span>}
              </td>
              <td className={`px-4 py-3 text-right font-mono ${s.ledger?.dette > 0 ? "text-rose-600 font-semibold" : "text-emerald-600"}`}>{money(s.ledger?.dette)}</td>
              {onPay && (
                <td className="px-4 py-3 text-right whitespace-nowrap">
                  <button onClick={() => onPay(s)} data-testid={`btn-pay-${s.id}`} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-3 py-1.5 rounded-md text-xs font-semibold">
                    <DollarSign className="h-3.5 w-3.5" /> Encaisser
                  </button>
                  {onDelete && <button onClick={() => onDelete(s)} data-testid={`btn-delete-student-${s.id}`} className="ml-2 text-slate-400 hover:text-rose-600 align-middle" title="Supprimer"><Trash2 className="h-4 w-4 inline" /></button>}
                </td>
              )}
            </tr>
          ))}
          {students.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun élève</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function AddStudentDialog({ open, onClose, classes, onSaved }) {
  const empty = { nom: "", postnom: "", prenom: "", genre: "M", date_naissance: "", class_id: "", tuteur_nom: "", tuteur_contact: "", status: "pre_inscrit" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.nom || !form.class_id) { toast.error("Nom et classe requis"); return; }
    setSaving(true);
    try {
      await api.post("/students", form);
      toast.success("Élève enregistré (Pré-inscrit)");
      setForm(empty); onClose(); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-white" data-testid="add-student-dialog">
        <DialogHeader><DialogTitle className="font-display">Formulaire d'inscription</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Nom *"><input className="fld" value={form.nom} onChange={(e) => set("nom", e.target.value)} data-testid="input-student-nom" /></Field>
          <Field label="Post-nom"><input className="fld" value={form.postnom} onChange={(e) => set("postnom", e.target.value)} /></Field>
          <Field label="Prénom"><input className="fld" value={form.prenom} onChange={(e) => set("prenom", e.target.value)} /></Field>
          <Field label="Genre">
            <select className="fld" value={form.genre} onChange={(e) => set("genre", e.target.value)}><option value="M">Masculin</option><option value="F">Féminin</option></select>
          </Field>
          <Field label="Date de naissance"><input type="date" className="fld" value={form.date_naissance} onChange={(e) => set("date_naissance", e.target.value)} /></Field>
          <Field label="Classe *">
            <select className="fld" value={form.class_id} onChange={(e) => set("class_id", e.target.value)} data-testid="select-student-class">
              <option value="">— Choisir —</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
            </select>
          </Field>
          <Field label="Nom du tuteur"><input className="fld" value={form.tuteur_nom} onChange={(e) => set("tuteur_nom", e.target.value)} /></Field>
          <Field label="Contact tuteur"><input className="fld" value={form.tuteur_contact} onChange={(e) => set("tuteur_contact", e.target.value)} /></Field>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving} data-testid="btn-save-student" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PaymentDialog({ student, onClose, onPaid, taux }) {
  const [ledger, setLedger] = useState(null);
  const [currency, setCurrency] = useState("USD");
  const [alloc, setAlloc] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) { setAlloc({}); setCurrency("USD"); api.get(`/students/${student.id}`).then((r) => setLedger(r.data.ledger)); }
  }, [student]);

  const total = Object.values(alloc).reduce((a, b) => a + (parseFloat(b) || 0), 0);
  const resteInCur = (resteUsd) => (currency === "FC" ? Math.round(resteUsd * taux) : Math.round(resteUsd * 100) / 100);

  const submit = async () => {
    const allocations = (ledger?.mois || []).map((m) => ({ category: m.key, amount: parseFloat(alloc[m.key]) || 0 })).filter((a) => a.amount > 0);
    if (allocations.length === 0) { toast.error("Saisissez au moins un montant"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/payments", { student_id: student.id, allocations, currency });
      toast.success(`Paiement de ${money(data.payment.total_amount, currency)} enregistré`);
      const rec = await api.get(`/receipts/${data.payment.id}`);
      onClose(); onPaid(rec.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={!!student} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white" data-testid="payment-split-calculator">
        <DialogHeader>
          <DialogTitle className="font-display">Guichet de paiement mensuel</DialogTitle>
          <p className="text-sm text-slate-500">{student?.nom} {student?.postnom} — {student?.matricule}</p>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Devise :</span>
          {["USD", "FC"].map((c) => (
            <button key={c} onClick={() => setCurrency(c)} data-testid={`btn-currency-${c}`}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${currency === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-300"}`}>
              {c === "USD" ? "Dollar ($)" : "Franc (FC)"}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-slate-400 -mt-1">Reste dû affiché dans la devise choisie. Taux : 1 $ = {taux.toLocaleString("fr-FR")} FC.</p>
        <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
          {(ledger?.mois || []).map((m) => {
            const reste = resteInCur(m.reste);
            return (
              <div key={m.key} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    {m.label}
                    {m.status === "paye" && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 rounded">payé</span>}
                    {m.status === "partiel" && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded">partiel</span>}
                  </div>
                  <div className="text-[11px] text-slate-400">Reste : {money(reste, currency)}</div>
                </div>
                <input type="number" min="0" placeholder="0" className="fld w-24 text-right font-mono"
                  value={alloc[m.key] || ""} data-testid={`input-alloc-${m.key}`}
                  onChange={(e) => setAlloc((a) => ({ ...a, [m.key]: e.target.value }))} />
                <button type="button" onClick={() => setAlloc((a) => ({ ...a, [m.key]: reste || "" }))} disabled={reste <= 0}
                  data-testid={`btn-solder-${m.key}`} className="text-[11px] text-emerald-700 hover:underline disabled:opacity-30 disabled:no-underline whitespace-nowrap">Solder</button>
              </div>
            );
          })}
          {ledger && (ledger.mois || []).every((m) => m.du <= 0) && (
            <p className="text-xs text-amber-600 bg-amber-50 rounded p-2">Aucun frais mensuel défini pour cette classe. Fixez-le dans « Frais par classe ».</p>
          )}
        </div>
        <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-emerald-800">Total à encaisser</span>
          <span className="font-display font-bold text-lg text-emerald-700 tabular" data-testid="payment-total">{money(total, currency)}</span>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving || total <= 0} data-testid="btn-allocate-payment" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Receipt className="h-4 w-4" />} Encaisser & Reçu
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DebtsPanel({ students, classes, className }) {
  const settings = useSettings();
  const taux = Number(settings.taux_change) || 2800;
  const [classId, setClassId] = useState("");
  const list = classId ? students.filter((s) => s.class_id === classId) : students;
  const STAT = { paye: "bg-emerald-500", partiel: "bg-amber-400", impaye: "bg-rose-400", na: "bg-slate-200" };
  return (
    <div data-testid="debts-panel">
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Dettes par mois</h2>
          <p className="text-sm text-slate-500">Suivi des mois payés / impayés par élève (Septembre → Juin).</p>
        </div>
        <label className="ml-auto block"><span className="text-xs font-medium text-slate-600">Filtrer par classe</span>
          <select className="fld mt-1 min-w-[220px]" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="select-debts-class">
            <option value="">Toutes les classes</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.section}</option>)}
          </select></label>
      </div>
      <div className="flex flex-wrap gap-4 mb-3 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-emerald-500" /> Payé</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-amber-400" /> Partiel</span>
        <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-rose-400" /> Impayé</span>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Élève</th>
              <th className="text-left px-4 py-3">Classe</th>
              <th className="text-center px-4 py-3">Mois (Sept → Juin)</th>
              <th className="text-center px-4 py-3">Payés</th>
              <th className="text-right px-4 py-3">Dette</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t border-slate-100" data-testid={`debt-row-${s.id}`}>
                <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{s.nom} {s.postnom}</td>
                <td className="px-4 py-3 text-slate-600 whitespace-nowrap">{className(s.class_id)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-center">
                    {(s.ledger?.mois || []).map((m) => (
                      <span key={m.key} title={`${m.label} — ${m.status}`} data-testid={`debt-${s.id}-${m.key}`}
                        className={`h-6 w-7 rounded text-[9px] grid place-items-center text-white font-semibold ${STAT[m.status] || STAT.na}`}>
                        {m.label.slice(0, 3)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-center font-mono text-slate-600">{s.ledger?.mois_payes ?? 0}/10</td>
                <td className={`px-4 py-3 text-right font-mono ${s.ledger?.dette > 0 ? "text-rose-600 font-semibold" : "text-emerald-600"}`}>
                  {money(s.ledger?.dette)}
                  <div className="text-[10px] text-slate-400">{money((s.ledger?.dette || 0) * taux, "FC")}</div>
                </td>
              </tr>
            ))}
            {list.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun élève</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ExpensesPanel({ expenses, reload, recettes, depenses }) {
  const [form, setForm] = useState({ category: "Salaires profs", amount: "", currency: "FC", description: "" });
  const [saving, setSaving] = useState(false);
  const cats = ["Salaires profs", "Matériel", "Entretien", "Frais admin"];

  const add = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) { toast.error("Montant invalide"); return; }
    setSaving(true);
    try {
      await api.post("/expenses", { ...form, amount: parseFloat(form.amount) });
      toast.success("Dépense enregistrée");
      setForm({ category: "Salaires profs", amount: "", currency: "FC", description: "" });
      reload();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const del = async (id) => { await api.delete(`/expenses/${id}`); reload(); };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-display font-semibold text-slate-800">Registre des dépenses</h3>
          <div className="text-xs text-slate-500">Recettes {money(recettes)} · Dépenses {money(depenses)} (converti en $)</div>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Catégorie</th><th className="text-left px-4 py-3">Description</th><th className="text-left px-4 py-3">Date</th><th className="text-right px-4 py-3">Montant</th><th></th></tr>
          </thead>
          <tbody>
            {expenses.map((e) => (
              <tr key={e.id} className="border-t border-slate-100">
                <td className="px-4 py-3 text-slate-700">{e.category}</td>
                <td className="px-4 py-3 text-slate-500">{e.description}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(e.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-right font-mono text-rose-600">{money(e.amount, e.currency)}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => del(e.id)} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune dépense</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 p-5 h-fit">
        <h3 className="font-display font-semibold text-slate-800 mb-4 flex items-center gap-2"><PlusCircle className="h-5 w-5 text-emerald-600" /> Nouvelle dépense</h3>
        <div className="space-y-3">
          <Field label="Catégorie"><select className="fld" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{cats.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Montant"><input type="number" className="fld" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="input-expense-amount" /></Field>
            <Field label="Devise"><select className="fld" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} data-testid="select-expense-devise"><option value="FC">Franc (FC)</option><option value="USD">Dollar ($)</option></select></Field>
          </div>
          <Field label="Description"><input className="fld" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <button onClick={add} disabled={saving} data-testid="btn-add-expense" className="w-full flex items-center justify-center gap-2 bg-emerald-600 text-white py-2 rounded-lg text-sm font-semibold disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
