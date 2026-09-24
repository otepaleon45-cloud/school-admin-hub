import { useEffect, useState, useCallback } from "react";
import api, { money, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, UserPlus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const EMPTY = { name: "", telephone: "", email: "", access_code: "", salaire: "", devise: "FC" };

export default function TeachersPanel() {
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => { const { data } = await api.get("/teachers"); setTeachers(data); }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name || form.access_code.length !== 4) { toast.error("Nom et code à 4 chiffres requis"); return; }
    setSaving(true);
    try {
      await api.post("/teachers", { ...form, email: form.email || null, telephone: form.telephone || null, salaire: parseFloat(form.salaire) || 0 });
      toast.success("Enseignant enregistré"); setOpen(false); setForm(EMPTY); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const del = async (t) => {
    if (!window.confirm(`Supprimer l'enseignant ${t.name} ?`)) return;
    try { await api.delete(`/users/${t.id}`); toast.success("Enseignant supprimé"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div data-testid="teachers-panel">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Enseignants & salaires</h2>
          <p className="text-sm text-slate-500">Enregistrez les enseignants et leur salaire mensuel (payé chaque mois, en FC ou en $).</p>
        </div>
        <button onClick={() => setOpen(true)} data-testid="btn-add-teacher" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold"><UserPlus className="h-4 w-4" /> Ajouter un enseignant</button>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="text-left px-4 py-3">Nom</th><th className="text-left px-4 py-3">Téléphone</th><th className="text-left px-4 py-3">Code</th><th className="text-right px-4 py-3">Salaire mensuel</th><th className="text-left px-4 py-3">Devise</th><th className="text-right px-4 py-3">Action</th></tr></thead>
          <tbody>
            {teachers.map((t) => (
              <tr key={t.id} className="border-t border-slate-100" data-testid={`teacher-row-${t.id}`}>
                <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                <td className="px-4 py-3 text-slate-600">{t.telephone || "—"}</td>
                <td className="px-4 py-3 font-mono text-slate-600">{t.access_code}</td>
                <td className="px-4 py-3 text-right font-mono text-slate-800">{money(t.salaire ?? t.salaire_trimestre, t.devise || "FC")}</td>
                <td className="px-4 py-3 text-slate-600">{t.devise || "FC"} · par mois</td>
                <td className="px-4 py-3 text-right"><button onClick={() => del(t)} data-testid={`btn-delete-teacher-${t.id}`} className="text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {teachers.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun enseignant</td></tr>}
          </tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md bg-white">
          <DialogHeader><DialogTitle className="font-display">Nouvel enseignant</DialogTitle></DialogHeader>
          <label className="block"><span className="text-xs font-medium text-slate-600">Nom complet</span><input className="fld mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-teacher-name" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-slate-600">Téléphone</span><input className="fld mt-1" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} data-testid="input-teacher-phone" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Code d'accès (4 chiffres)</span><input className="fld mt-1 font-mono" maxLength={4} value={form.access_code} onChange={(e) => setForm({ ...form, access_code: e.target.value.replace(/\D/g, "") })} data-testid="input-teacher-code" /></label>
          </div>
          <label className="block"><span className="text-xs font-medium text-slate-600">Email (optionnel)</span><input className="fld mt-1" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="input-teacher-email" /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs font-medium text-slate-600">Salaire mensuel</span><input type="number" min="0" className="fld mt-1" value={form.salaire} onChange={(e) => setForm({ ...form, salaire: e.target.value })} data-testid="input-teacher-salary" /></label>
            <label className="block"><span className="text-xs font-medium text-slate-600">Devise</span>
              <select className="fld mt-1" value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} data-testid="select-teacher-devise"><option value="FC">Franc Congolais (FC)</option><option value="USD">Dollar ($)</option></select></label>
          </div>
          <DialogFooter>
            <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
            <button onClick={submit} disabled={saving} data-testid="btn-save-teacher" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Enregistrer</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
