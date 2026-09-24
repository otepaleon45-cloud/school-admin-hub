import { useEffect, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Save, Plus, X } from "lucide-react";
import { useSettings, refreshSettings } from "@/hooks/useSettings";

export default function SettingsPanel() {
  const settings = useSettings();
  const [form, setForm] = useState(null);
  const [newOpt, setNewOpt] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (settings.nom_ecole && !form) setForm({ ...settings }); }, [settings, form]);
  if (!form) return <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />;

  const set = (k, v) => setForm({ ...form, [k]: v });
  const addOpt = () => {
    const o = newOpt.trim();
    if (!o || form.options.includes(o)) return;
    set("options", [...form.options, o]); setNewOpt("");
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.put("/settings", form);
      await refreshSettings();
      toast.success("Paramètres enregistrés");
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl space-y-6" data-testid="settings-panel">
      <div>
        <h2 className="font-display font-bold text-lg text-slate-900">Paramètres de l'établissement</h2>
        <p className="text-sm text-slate-500">Année scolaire, identité de l'école et options organisées.</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Nom de l'école</span>
          <input className="fld mt-1" value={form.nom_ecole} onChange={(e) => set("nom_ecole", e.target.value)} data-testid="input-nom-ecole" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Sigle</span>
          <input className="fld mt-1" value={form.sigle} onChange={(e) => set("sigle", e.target.value)} data-testid="input-sigle" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Ville</span>
          <input className="fld mt-1" value={form.ville} onChange={(e) => set("ville", e.target.value)} data-testid="input-ville" /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Année scolaire</span>
          <input className="fld mt-1 font-mono" value={form.annee_scolaire} onChange={(e) => set("annee_scolaire", e.target.value)} placeholder="2026-2027" data-testid="input-annee" /></label>
        <label className="block sm:col-span-2"><span className="text-xs font-medium text-slate-600">Taux de change (nombre de FC pour 1 $)</span>
          <input type="number" min="0" className="fld mt-1 font-mono" value={form.taux_change ?? 2800} onChange={(e) => set("taux_change", e.target.value)} placeholder="2800" data-testid="input-taux-change" />
          <span className="text-[11px] text-slate-400">Sert à convertir les paiements/salaires entre $ et FC.</span></label>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h3 className="font-semibold text-slate-800 mb-3">Options organisées (Humanités)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {form.options.map((o) => (
            <span key={o} className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-800 border border-indigo-200 px-3 py-1 rounded-full text-sm" data-testid={`option-chip-${o}`}>
              {o}
              <button onClick={() => set("options", form.options.filter((x) => x !== o))} className="hover:text-rose-600" aria-label={`Retirer ${o}`}><X className="h-3.5 w-3.5" /></button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="fld" value={newOpt} onChange={(e) => setNewOpt(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addOpt()} placeholder="Nouvelle option (ex. Mécanique)" data-testid="input-new-option" />
          <button onClick={addOpt} data-testid="btn-add-option" className="inline-flex items-center gap-1 px-4 py-2 rounded-lg border border-indigo-300 text-indigo-700 hover:bg-indigo-50 text-sm font-semibold whitespace-nowrap"><Plus className="h-4 w-4" /> Ajouter</button>
        </div>
      </div>

      <button onClick={save} disabled={saving} data-testid="btn-save-settings"
        className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-60">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer les paramètres
      </button>
    </div>
  );
}
