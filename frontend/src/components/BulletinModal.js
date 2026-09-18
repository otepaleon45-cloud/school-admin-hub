import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Printer, School, X } from "lucide-react";

export default function BulletinModal({ bulletin, open, onClose }) {
  if (!bulletin) return null;
  const s = bulletin.student || {};
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 bg-white max-h-[90vh] overflow-y-auto" data-testid="bulletin-print-modal">
        <DialogTitle className="sr-only">Bulletin scolaire</DialogTitle>
        <div className="print-area watermark">
          <div className="p-6">
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-indigo-700 grid place-items-center text-white">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-slate-900 leading-tight">RÉPUBLIQUE - MIN. EPST</div>
                  <div className="text-xs text-slate-600">Lycée d'État Général Lumumba</div>
                  <div className="text-[11px] text-slate-500">Année scolaire 2025-2026</div>
                </div>
              </div>
              <div className="text-right text-xs text-slate-600">
                <div className="font-display font-bold text-slate-900">BULLETIN SCOLAIRE</div>
                <div>Trimestre {bulletin.trimestre}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-1 text-sm my-4">
              <div className="text-slate-500">Élève : <span className="font-semibold text-slate-900">{s.nom} {s.postnom} {s.prenom}</span></div>
              <div className="text-slate-500 text-right">Matricule : <span className="font-mono text-slate-800">{s.matricule}</span></div>
              <div className="text-slate-500">Classe : <span className="text-slate-800">{bulletin.class_name}</span></div>
              <div className="text-slate-500 text-right">Genre : <span className="text-slate-800">{s.genre}</span></div>
            </div>

            <table className="w-full text-sm border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-2 border-b border-slate-300">Matière</th>
                  <th className="text-center px-2 py-2 border-b border-slate-300">Coef.</th>
                  <th className="text-center px-2 py-2 border-b border-slate-300">Moyenne /20</th>
                  <th className="text-center px-2 py-2 border-b border-slate-300">Total</th>
                </tr>
              </thead>
              <tbody>
                {bulletin.lines.map((l, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-3 py-1.5 text-slate-800">{l.matiere}</td>
                    <td className="px-2 py-1.5 text-center text-slate-600">{l.coefficient}</td>
                    <td className={`px-2 py-1.5 text-center font-mono font-medium ${l.moyenne == null ? "text-slate-400" : l.moyenne >= 10 ? "text-emerald-700" : "text-rose-600"}`}>
                      {l.moyenne == null ? "—" : l.moyenne.toFixed(1)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-mono text-slate-800">{l.total == null ? "—" : l.total.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              {[
                ["Moyenne générale", bulletin.moyenne_generale != null ? `${bulletin.moyenne_generale.toFixed(2)}/20` : "—"],
                ["Pourcentage", bulletin.pourcentage != null ? `${bulletin.pourcentage}%` : "—"],
                ["Place / Rang", bulletin.rang ? `${bulletin.rang}e / ${bulletin.total_eleves}` : "—"],
                ["Mention", bulletin.mention],
              ].map(([k, v]) => (
                <div key={k} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="text-[11px] text-slate-500 uppercase tracking-wide">{k}</div>
                  <div className="font-display font-bold text-slate-900">{v}</div>
                </div>
              ))}
            </div>

            <div className="flex justify-between items-end mt-8 text-center text-[11px] text-slate-500">
              <div><div className="h-12 border-b border-slate-400 w-32" /><div className="mt-1">Le Titulaire</div></div>
              <div><div className="h-12 border-b border-slate-400 w-32" /><div className="mt-1">Le Chef d'établissement</div></div>
              <div className="h-16 w-16 rounded-full border-2 border-indigo-300 grid place-items-center text-[9px] text-indigo-400 leading-tight rotate-[-12deg]">CACHET<br />ÉCOLE<br />D'ÉTAT</div>
            </div>
          </div>
        </div>

        <div className="no-print flex gap-2 p-4 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50">
            <X className="h-4 w-4" /> Fermer
          </button>
          <button onClick={() => window.print()} data-testid="btn-print-bulletin" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
