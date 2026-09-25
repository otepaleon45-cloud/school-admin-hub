import { useEffect, useState, useCallback } from "react";
import api, { money, formatApiError } from "@/lib/api";
import { useSettings } from "@/hooks/useSettings";
import { toast } from "sonner";
import { Loader2, Save, Trash2, Plus, ShoppingCart, Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const CATEGORIES = ["Uniforme", "Technique", "Stage", "Autre"];

export default function FeeItemsPanel({ students, onReceipt }) {
  const settings = useSettings();
  const taux = Number(settings.taux_change) || 2800;
  const [items, setItems] = useState([]);
  const [sales, setSales] = useState([]);
  const [edits, setEdits] = useState({});
  const [saving, setSaving] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);

  const load = useCallback(async () => {
    const [it, sa] = await Promise.all([api.get("/fee-items"), api.get("/sales")]);
    setItems(it.data); setSales(sa.data);
  }, []);
  useEffect(() => { load().catch((e) => toast.error(formatApiError(e.response?.data?.detail))); }, [load]);

  const prixVal = (it) => (edits[it.id]?.prix ?? it.prix ?? 0);
  const devVal = (it) => (edits[it.id]?.devise ?? it.devise ?? "USD");
  const dirty = (it) => edits[it.id] !== undefined;
  const setField = (it, k, v) => setEdits({ ...edits, [it.id]: { prix: prixVal(it), devise: devVal(it), [k]: v } });

  const save = async (it) => {
    setSaving(it.id);
    try {
      await api.put(`/fee-items/${it.id}`, { name: it.name, category: it.category, prix: parseFloat(prixVal(it)) || 0, devise: devVal(it) });
      toast.success(`Prix enregistré · ${it.name}`);
      const e = { ...edits }; delete e[it.id]; setEdits(e); load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(null); }
  };
  const del = async (it) => {
    if (!window.confirm(`Supprimer « ${it.name} » ?`)) return;
    try { await api.delete(`/fee-items/${it.id}`); toast.success("Article supprimé"); load(); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };
  const reprint = async (s) => {
    try { const { data } = await api.get(`/sale-receipts/${s.id}`); onReceipt(data); }
    catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  const groups = {};
  items.forEach((it) => { (groups[it.category] ||= []).push(it); });

  return (
    <div className="space-y-6" data-testid="fee-items-panel">
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-lg text-slate-900">Frais divers & Uniformes</h2>
          <p className="text-sm text-slate-500">Définissez les prix (uniformes, frais techniques, stages…) puis encaissez-les avec reçu.</p>
        </div>
        <button onClick={() => setSaleOpen(true)} data-testid="btn-open-sale" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <ShoppingCart className="h-4 w-4" /> Encaisser des frais
        </button>
      </div>

      {CATEGORIES.filter((c) => groups[c]?.length).map((cat) => (
        <div key={cat} className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-600">{cat}</div>
          <table className="w-full text-sm">
            <thead className="text-slate-500 text-xs uppercase"><tr>
              <th className="text-left px-4 py-2">Article / Frais</th>
              <th className="text-right px-3 py-2">Prix</th>
              <th className="text-left px-3 py-2">Devise</th>
              <th className="text-right px-3 py-2">≈ autre devise</th>
              <th className="px-3 py-2" />
            </tr></thead>
            <tbody>
              {groups[cat].map((it) => {
                const p = parseFloat(prixVal(it)) || 0;
                const alt = devVal(it) === "USD" ? money(p * taux, "FC") : money(p / taux, "USD");
                return (
                  <tr key={it.id} className="border-t border-slate-100" data-testid={`item-row-${it.id}`}>
                    <td className="px-4 py-2 font-medium text-slate-800">{it.name}</td>
                    <td className="px-3 py-2 text-right">
                      <input type="number" min="0" step="0.5" value={prixVal(it)} onChange={(e) => setField(it, "prix", e.target.value)}
                        data-testid={`input-prix-${it.id}`} className="w-28 text-right rounded-md border border-slate-300 px-2 py-1 font-mono text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
                    </td>
                    <td className="px-3 py-2">
                      <select value={devVal(it)} onChange={(e) => setField(it, "devise", e.target.value)} data-testid={`select-devise-${it.id}`} className="rounded-md border border-slate-300 px-2 py-1 text-sm">
                        <option value="USD">$ (USD)</option><option value="FC">FC</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-right font-mono text-slate-400">{alt}</td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => save(it)} disabled={!dirty(it) || saving === it.id} data-testid={`btn-save-item-${it.id}`}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-40">
                        {saving === it.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Enregistrer
                      </button>
                      <button onClick={() => del(it)} data-testid={`btn-delete-item-${it.id}`} className="ml-2 text-slate-400 hover:text-rose-600" title="Supprimer"><Trash2 className="h-4 w-4 inline" /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      <button onClick={() => setAddOpen(true)} data-testid="btn-add-item" className="inline-flex items-center gap-2 text-sm text-emerald-700 hover:underline font-medium"><Plus className="h-4 w-4" /> Ajouter un nouvel article / frais</button>

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-100 font-display font-semibold text-slate-800">Encaissements récents</div>
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr>
            <th className="text-left px-4 py-3">Reçu</th><th className="text-left px-4 py-3">Client / Élève</th>
            <th className="text-left px-4 py-3">Articles</th><th className="text-left px-4 py-3">Date</th>
            <th className="text-right px-4 py-3">Total</th><th className="px-4 py-3" />
          </tr></thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id} className="border-t border-slate-100" data-testid={`sale-row-${s.id}`}>
                <td className="px-4 py-3 font-mono text-slate-600">{s.receipt_no}</td>
                <td className="px-4 py-3 text-slate-800">{s.client_name || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{(s.lines || []).map((l, i) => <span key={i} className="inline-block mr-2 bg-slate-100 rounded px-1.5 py-0.5">{l.name}×{l.qty}</span>)}</td>
                <td className="px-4 py-3 text-slate-500">{new Date(s.date).toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-right font-mono text-emerald-700">{money(s.total_amount, s.currency)}</td>
                <td className="px-4 py-3 text-right"><button onClick={() => reprint(s)} data-testid={`btn-reprint-${s.id}`} className="text-slate-400 hover:text-emerald-600" title="Réimprimer"><Printer className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {sales.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun encaissement</td></tr>}
          </tbody>
        </table>
      </div>

      <AddItemDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
      <SaleDialog open={saleOpen} onClose={() => setSaleOpen(false)} items={items} students={students} taux={taux} onPaid={(rec) => { setSaleOpen(false); load(); onReceipt(rec); }} />
    </div>
  );
}

function AddItemDialog({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ name: "", category: "Uniforme", prix: "", devise: "USD" });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    if (!form.name.trim()) { toast.error("Nom requis"); return; }
    setSaving(true);
    try {
      await api.post("/fee-items", { ...form, prix: parseFloat(form.prix) || 0 });
      toast.success("Article ajouté"); setForm({ name: "", category: "Uniforme", prix: "", devise: "USD" }); onClose(); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader><DialogTitle className="font-display">Nouvel article / frais</DialogTitle></DialogHeader>
        <label className="block"><span className="text-xs font-medium text-slate-600">Nom</span><input className="fld mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-item-name" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Catégorie</span>
          <select className="fld mt-1" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} data-testid="select-item-category">{CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs font-medium text-slate-600">Prix</span><input type="number" min="0" className="fld mt-1" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} data-testid="input-item-prix" /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Devise</span><select className="fld mt-1" value={form.devise} onChange={(e) => setForm({ ...form, devise: e.target.value })} data-testid="select-item-devise"><option value="USD">$ (USD)</option><option value="FC">FC</option></select></label>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving} data-testid="btn-save-item" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-60">{saving && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter</button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaleDialog({ open, onClose, items, students, taux, onPaid }) {
  const [currency, setCurrency] = useState("USD");
  const [studentId, setStudentId] = useState("");
  const [clientName, setClientName] = useState("");
  const [qty, setQty] = useState({});
  const [saving, setSaving] = useState(false);

  const conv = (amount, from, to) => {
    if (from === to) return amount;
    if (from === "USD" && to === "FC") return amount * taux;
    if (from === "FC" && to === "USD") return amount / taux;
    return amount;
  };
  const prixInCur = (it) => {
    const v = conv(it.prix || 0, it.devise || "USD", currency);
    return currency === "FC" ? Math.round(v) : Math.round(v * 100) / 100;
  };
  const total = items.reduce((sum, it) => sum + prixInCur(it) * (parseInt(qty[it.id]) || 0), 0);

  const submit = async () => {
    const lines = items.filter((it) => (parseInt(qty[it.id]) || 0) > 0 && prixInCur(it) > 0)
      .map((it) => ({ item_id: it.id, name: it.name, prix: prixInCur(it), qty: parseInt(qty[it.id]) }));
    if (lines.length === 0) { toast.error("Sélectionnez au moins un article (prix et quantité)"); return; }
    setSaving(true);
    try {
      const { data } = await api.post("/sales", { student_id: studentId || null, client_name: clientName, currency, lines });
      toast.success(`Encaissement de ${money(data.sale.total_amount, currency)} enregistré`);
      const rec = await api.get(`/sale-receipts/${data.sale.id}`);
      setQty({}); setStudentId(""); setClientName("");
      onPaid(rec.data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg bg-white" data-testid="sale-dialog">
        <DialogHeader><DialogTitle className="font-display">Encaisser des frais divers</DialogTitle></DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs font-medium text-slate-600">Élève (optionnel)</span>
            <select className="fld mt-1" value={studentId} onChange={(e) => setStudentId(e.target.value)} data-testid="select-sale-student">
              <option value="">— Client externe —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.nom} {s.postnom}</option>)}
            </select></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Nom (si pas d'élève)</span>
            <input className="fld mt-1" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nom du client" data-testid="input-sale-client" /></label>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Devise :</span>
          {["USD", "FC"].map((c) => (
            <button key={c} onClick={() => setCurrency(c)} data-testid={`btn-sale-currency-${c}`}
              className={`px-3 py-1 rounded-md text-xs font-semibold border transition-colors ${currency === c ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-slate-600 border-slate-300"}`}>
              {c === "USD" ? "Dollar ($)" : "Franc (FC)"}
            </button>
          ))}
        </div>
        <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
          {items.map((it) => {
            const p = prixInCur(it);
            return (
              <div key={it.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-700">{it.name} <span className="text-[10px] text-slate-400">{it.category}</span></div>
                  <div className="text-[11px] text-slate-400">Prix : {money(p, currency)}</div>
                </div>
                <input type="number" min="0" placeholder="0" className="fld w-20 text-right font-mono"
                  value={qty[it.id] || ""} data-testid={`input-qty-${it.id}`}
                  onChange={(e) => setQty((q) => ({ ...q, [it.id]: e.target.value }))} />
              </div>
            );
          })}
          {items.length === 0 && <p className="text-xs text-slate-400">Aucun article. Ajoutez-en d'abord dans le catalogue.</p>}
        </div>
        <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-emerald-800">Total à encaisser</span>
          <span className="font-display font-bold text-lg text-emerald-700" data-testid="sale-total">{money(total, currency)}</span>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving || total <= 0} data-testid="btn-confirm-sale" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />} Encaisser & Reçu
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
