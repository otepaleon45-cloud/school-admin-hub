import { useEffect, useState, useCallback } from "react";
import Layout from "@/components/Layout";
import BulletinModal from "@/components/BulletinModal";
import api, { formatApiError } from "@/lib/api";
import { toast } from "sonner";
import {
  BookOpen, PlusCircle, Loader2, Printer, Award, FileSpreadsheet,
  Users, Trash2, Save, GraduationCap,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const TABS = [
  { key: "classes", label: "Mes Classes & Matières" },
  { key: "cahier", label: "Évaluations & Cahier" },
  { key: "bulletins", label: "Bulletins" },
];

const MENTION_COLOR = (m) => m >= 10 ? "text-emerald-700 bg-emerald-50" : "text-rose-600 bg-rose-50";

export default function EnseignantDashboard() {
  const [tab, setTab] = useState("classes");
  const [myClasses, setMyClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [trimestre, setTrimestre] = useState(1);
  const [subjectId, setSubjectId] = useState("");
  const [bulletin, setBulletin] = useState(null);

  const loadBase = useCallback(async () => {
    const [mc, subs] = await Promise.all([api.get("/my-classes"), api.get("/subjects?mine=true")]);
    setMyClasses(mc.data); setSubjects(subs.data);
    if (!subjectId && subs.data.length) setSubjectId(subs.data[0].id);
  }, [subjectId]);

  useEffect(() => { loadBase().catch((e) => toast.error(formatApiError(e.response?.data?.detail))); }, []); // eslint-disable-line

  return (
    <Layout title="Espace Enseignant" subtitle="Classes, cotations et bulletins scolaires">
      <div className="flex gap-2 mb-6 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-amber-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "classes" && <MyClasses myClasses={myClasses} subjects={subjects} reload={loadBase} />}

      {tab === "cahier" && (
        <CahierPanel subjects={subjects} subjectId={subjectId} setSubjectId={setSubjectId} trimestre={trimestre} setTrimestre={setTrimestre} />
      )}

      {tab === "bulletins" && (
        <BulletinsPanel myClasses={myClasses} trimestre={trimestre} setTrimestre={setTrimestre} onOpen={setBulletin} />
      )}

      <BulletinModal bulletin={bulletin} open={!!bulletin} onClose={() => setBulletin(null)} />
    </Layout>
  );
}

function MyClasses({ myClasses, subjects, reload }) {
  const [addOpen, setAddOpen] = useState(false);
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-display font-bold text-lg text-slate-900">Cours attribués</h2>
        <button onClick={() => setAddOpen(true)} data-testid="btn-add-subject" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <PlusCircle className="h-4 w-4" /> Nouvelle matière
        </button>
      </div>
      {myClasses.length === 0 && <p className="text-slate-400 text-sm">Aucune classe attribuée. Ajoutez une matière pour commencer.</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {myClasses.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5" data-testid={`class-card-${c.id}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900">{c.name} {c.section}</h3>
              <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Users className="h-3.5 w-3.5" /> {c.effectif}</span>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {c.matieres.map((m) => (
                <span key={m.id} className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-800 text-xs font-medium border border-amber-100">
                  {m.name} · coef {m.coefficient}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <AddSubjectDialog open={addOpen} onClose={() => setAddOpen(false)} onSaved={reload} />
    </div>
  );
}

function AddSubjectDialog({ open, onClose, onSaved }) {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ name: "", class_id: "", coefficient: 1 });
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (open) api.get("/classes").then((r) => setClasses(r.data)); }, [open]);

  const submit = async () => {
    if (!form.name || !form.class_id) { toast.error("Nom et classe requis"); return; }
    setSaving(true);
    try {
      await api.post("/subjects", { ...form, coefficient: parseFloat(form.coefficient) || 1 });
      toast.success("Matière ajoutée"); setForm({ name: "", class_id: "", coefficient: 1 }); onClose(); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader><DialogTitle className="font-display">Nouvelle matière</DialogTitle></DialogHeader>
        <label className="block"><span className="text-xs font-medium text-slate-600">Nom de la matière</span>
          <input className="fld mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="input-subject-name" /></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Classe</span>
          <select className="fld mt-1" value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })} data-testid="select-subject-class">
            <option value="">— Choisir —</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Coefficient</span>
          <input type="number" className="fld mt-1" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} /></label>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving} data-testid="btn-save-subject" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Ajouter
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CahierPanel({ subjects, subjectId, setSubjectId, trimestre, setTrimestre }) {
  const [cahier, setCahier] = useState(null);
  const [edits, setEdits] = useState({}); // key evalId:studentId -> value
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newEvalOpen, setNewEvalOpen] = useState(false);

  const load = useCallback(async () => {
    if (!subjectId) { setCahier(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/cahier/${subjectId}?trimestre=${trimestre}`);
      setCahier(data); setEdits({});
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  }, [subjectId, trimestre]);

  useEffect(() => { load(); }, [load]);

  const cellVal = (evId, sid) => {
    const k = `${evId}:${sid}`;
    if (k in edits) return edits[k];
    const row = cahier.rows.find((r) => r.student_id === sid);
    const cell = row?.cells.find((c) => c.evaluation_id === evId);
    return cell?.value ?? "";
  };

  const saveEval = async (evId) => {
    const grades = cahier.rows.map((r) => {
      const k = `${evId}:${r.student_id}`;
      const v = k in edits ? edits[k] : r.cells.find((c) => c.evaluation_id === evId)?.value;
      return { student_id: r.student_id, value: v === "" || v == null ? null : v };
    });
    setSaving(true);
    try {
      await api.post("/grades", { evaluation_id: evId, grades });
      toast.success("Cotes enregistrées — moyennes recalculées");
      await load();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const delEval = async (evId) => {
    if (!window.confirm("Supprimer cette évaluation et ses cotes ?")) return;
    await api.delete(`/evaluations/${evId}`); load();
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block"><span className="text-xs font-medium text-slate-600">Matière</span>
          <select className="fld mt-1 min-w-[220px]" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} data-testid="select-cahier-subject">
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name} — {s.class_name}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Trimestre</span>
          <select className="fld mt-1" value={trimestre} onChange={(e) => setTrimestre(parseInt(e.target.value))} data-testid="select-trimestre-filter">
            {[1, 2, 3].map((t) => <option key={t} value={t}>Trimestre {t}</option>)}
          </select></label>
        <button onClick={() => setNewEvalOpen(true)} data-testid="btn-new-evaluation" className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-semibold">
          <PlusCircle className="h-4 w-4" /> Nouvelle évaluation
        </button>
        <button onClick={() => window.print()} data-testid="btn-print-cahier-cotes" className="flex items-center gap-2 border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 ml-auto">
          <Printer className="h-4 w-4" /> Imprimer le cahier
        </button>
      </div>

      {loading && <div className="py-10 grid place-items-center"><Loader2 className="h-6 w-6 animate-spin text-amber-600" /></div>}

      {!loading && cahier && (
        <div className="print-area bg-white rounded-xl border border-slate-200 overflow-x-auto" data-testid="cahier-cotations-table">
          <div className="px-4 py-3 border-b border-slate-100">
            <h3 className="font-display font-bold text-slate-900">Cahier de cotations — {cahier.subject.name}</h3>
            <p className="text-xs text-slate-500">{cahier.class_name} · Trimestre {cahier.trimestre}</p>
          </div>
          {cahier.evaluations.length === 0 ? (
            <p className="px-4 py-8 text-center text-slate-400 text-sm">Aucune évaluation pour ce trimestre. Créez-en une pour commencer la cotation.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left px-4 py-3 sticky left-0 bg-slate-50">Élève</th>
                  {cahier.evaluations.map((e) => (
                    <th key={e.id} className="px-2 py-2 text-center min-w-[90px]">
                      <div className="text-xs font-semibold text-slate-700">{e.title || e.type}</div>
                      <div className="text-[10px] text-slate-400">/{e.note_max} · c{e.coefficient}</div>
                      <div className="no-print flex justify-center gap-1 mt-1">
                        <button onClick={() => saveEval(e.id)} className="text-emerald-600 hover:text-emerald-800" title="Enregistrer"><Save className="h-3.5 w-3.5" /></button>
                        <button onClick={() => delEval(e.id)} className="text-slate-300 hover:text-rose-500" title="Supprimer"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-2 text-center bg-amber-50 text-amber-800">Moyenne /20</th>
                </tr>
              </thead>
              <tbody>
                {cahier.rows.map((r) => (
                  <tr key={r.student_id} className="border-t border-slate-100">
                    <td className="px-4 py-2 sticky left-0 bg-white font-medium text-slate-800">{r.nom}</td>
                    {cahier.evaluations.map((e) => (
                      <td key={e.id} className="px-2 py-1 text-center">
                        <input
                          type="number" min="0" max={e.note_max}
                          className="w-16 text-center border border-slate-200 rounded px-1 py-1 font-mono focus:ring-2 focus:ring-amber-400 outline-none"
                          value={cellVal(e.id, r.student_id)}
                          data-testid={`grade-input-${e.id}-${r.student_id}`}
                          onChange={(ev) => setEdits((s) => ({ ...s, [`${e.id}:${r.student_id}`]: ev.target.value }))}
                        />
                      </td>
                    ))}
                    <td className={`px-3 py-2 text-center font-mono font-bold ${r.moyenne == null ? "text-slate-300" : r.moyenne >= 10 ? "text-emerald-700" : "text-rose-600"}`} data-testid={`moyenne-${r.student_id}`}>
                      {r.moyenne == null ? "—" : r.moyenne.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      <NewEvalDialog open={newEvalOpen} onClose={() => setNewEvalOpen(false)} subjectId={subjectId} trimestre={trimestre} onSaved={load} />
    </div>
  );
}

function NewEvalDialog({ open, onClose, subjectId, trimestre, onSaved }) {
  const [form, setForm] = useState({ type: "Interrogation", title: "", note_max: 20, coefficient: 1 });
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await api.post("/evaluations", { subject_id: subjectId, trimestre, ...form, note_max: parseFloat(form.note_max), coefficient: parseFloat(form.coefficient) });
      toast.success("Évaluation créée"); onClose(); setForm({ type: "Interrogation", title: "", note_max: 20, coefficient: 1 }); onSaved();
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader><DialogTitle className="font-display">Nouvelle évaluation</DialogTitle></DialogHeader>
        <label className="block"><span className="text-xs font-medium text-slate-600">Type</span>
          <select className="fld mt-1" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} data-testid="select-eval-type">
            {["Interrogation", "Devoir", "Examen"].map((t) => <option key={t}>{t}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Intitulé</span>
          <input className="fld mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Ex: Interro 2" data-testid="input-eval-title" /></label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block"><span className="text-xs font-medium text-slate-600">Note max</span>
            <input type="number" className="fld mt-1" value={form.note_max} onChange={(e) => setForm({ ...form, note_max: e.target.value })} /></label>
          <label className="block"><span className="text-xs font-medium text-slate-600">Coefficient</span>
            <input type="number" className="fld mt-1" value={form.coefficient} onChange={(e) => setForm({ ...form, coefficient: e.target.value })} /></label>
        </div>
        <DialogFooter>
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-300 text-sm text-slate-600">Annuler</button>
          <button onClick={submit} disabled={saving} data-testid="btn-save-evaluation" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-semibold disabled:opacity-60">
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} Créer
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulletinsPanel({ myClasses, trimestre, setTrimestre, onOpen }) {
  const [classId, setClassId] = useState("");
  const [students, setStudents] = useState([]);
  useEffect(() => { if (!classId && myClasses.length) setClassId(myClasses[0].id); }, [myClasses]); // eslint-disable-line
  useEffect(() => { if (classId) api.get(`/students?class_id=${classId}`).then((r) => setStudents(r.data)); }, [classId]);

  const openBulletin = async (sid) => {
    try {
      const { data } = await api.get(`/bulletin/${sid}?trimestre=${trimestre}`);
      onOpen(data);
    } catch (e) { toast.error(formatApiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <label className="block"><span className="text-xs font-medium text-slate-600">Classe</span>
          <select className="fld mt-1 min-w-[200px]" value={classId} onChange={(e) => setClassId(e.target.value)} data-testid="select-bulletin-class">
            {myClasses.map((c) => <option key={c.id} value={c.id}>{c.name} {c.section}</option>)}
          </select></label>
        <label className="block"><span className="text-xs font-medium text-slate-600">Trimestre</span>
          <select className="fld mt-1" value={trimestre} onChange={(e) => setTrimestre(parseInt(e.target.value))}>
            {[1, 2, 3].map((t) => <option key={t} value={t}>Trimestre {t}</option>)}
          </select></label>
      </div>
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr><th className="text-left px-4 py-3">Matricule</th><th className="text-left px-4 py-3">Élève</th><th className="text-right px-4 py-3">Bulletin</th></tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-slate-100">
                <td className="px-4 py-3 font-mono text-slate-600">{s.matricule}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{s.nom} {s.postnom} {s.prenom}</td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => openBulletin(s.id)} data-testid={`btn-generate-bulletin-${s.id}`} className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 hover:bg-amber-100 px-3 py-1.5 rounded-md text-xs font-semibold">
                    <Award className="h-3.5 w-3.5" /> Générer bulletin
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-slate-400">Aucun élève</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
