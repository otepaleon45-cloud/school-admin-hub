import { useState } from "react";
import api, { money, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

const FEES = [
  ["frais_inscription", "Inscription"],
  ["frais_t1", "Trimestre 1"],
  ["frais_t2", "Trimestre 2"],
  ["frais_t3", "Trimestre 3"],
];

export default function ClassFeesPanel({ classes, reload }) {
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);

  const val = (c, k) => (edits[c.id]?.[k] ?? c[k] ?? 0);
  const setVal = (c, k, v) => setEdits({ ...edits, [c.id]: { ...(edits[c.id] || {}), [k]: v } });
  const dirty = (c) => !!edits[c.id];

  const save = async (c) => {
    setSaving(c.id);
    try {
      const body = { name: c.name, section: c.section, niveau: c.niveau || "" };
      FEES.forEach(([k]) => { body[k] = parseFloat(val(c, k)) || 0; });
      await api.put(`/classes/${c.id}`, body);
      toast.success(`Frais enregistrés · ${c.name} ${c.section}`);
      const e = { ...edits }; delete e[c.id]; setEdits(e);
      reload();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(null); }
  };

  const groups = {};
  classes.forEach((c) => { (groups[c.niveau || "Autres"] ||= []).push(c); });

  return (
    <div className="space-y-6" data-testid="class-fees-panel">
      <div>
        <h2 className="font-display font-bold text-lg text-slate-900">Frais par classe</h2>
        <p className="text-sm text-slate-500">Fixez les frais d'inscription et trimestriels ($). La dette de chaque élève est calculée automatiquement.</p>
      </div>
      {Object.entries(groups).map(([niveau, list]) => (
        <div key={niveau} className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">{niveau}</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-2">Classe</th>
                <th className="text-left px-4 py-2">Option / Section</th>
                {FEES.map(([k, l]) => <th key={k} className="text-right px-3 py-2">{l}</th>)}
                <th className="text-right px-3 py-2">Total annuel</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100" data-testid={`fee-row-${c.id}`}>
                  <td className="px-4 py-2 font-medium text-slate-800 whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">{c.section}</td>
                  {FEES.map(([k]) => (
                    <td key={k} className="px-3 py-2 text-right">
                      <input type="number" min="0" step="0.5" value={val(c, k)} onChange={(e) => setVal(c, k, e.target.value)}
                        data-testid={`input-${k}-${c.id}`}
                        className="w-24 text-right rounded-md border border-slate-300 px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-mono font-semibold text-slate-800">
                    {money(FEES.reduce((s, [k]) => s + (parseFloat(val(c, k)) || 0), 0))}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => save(c)} disabled={!dirty(c) || saving === c.id} data-testid={`btn-save-fees-${c.id}`}
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40">
                      {saving === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Enregistrer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
