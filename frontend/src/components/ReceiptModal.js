import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { money } from "@/lib/api";
import { Printer, School, X } from "lucide-react";

function numberToFrenchWords(n) {
  // simplified: return figure; French words for common amounts
  return `${money(n).replace("$", "")} dollars US`;
}

export default function ReceiptModal({ receipt, open, onClose }) {
  if (!receipt) return null;
  const d = new Date(receipt.date);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 bg-white" data-testid="receipt-print-modal">
        <DialogTitle className="sr-only">Reçu de paiement</DialogTitle>
        <div className="print-area watermark">
          <div className="p-6">
            <div className="flex items-start justify-between border-b-2 border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-lg bg-indigo-700 grid place-items-center text-white">
                  <School className="h-6 w-6" />
                </div>
                <div>
                  <div className="font-display font-extrabold text-slate-900 text-lg leading-tight">RÉPUBLIQUE - MIN. EPST</div>
                  <div className="text-xs text-slate-600">Lycée d'État Général Lumumba</div>
                  <div className="text-[11px] text-slate-500">Année scolaire 2025-2026</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] uppercase tracking-wider text-slate-500">Reçu N°</div>
                <div className="font-mono font-bold text-slate-900">{receipt.receipt_no}</div>
              </div>
            </div>

            <div className="text-center my-4">
              <div className="inline-block border border-slate-800 px-4 py-1 rounded font-display font-bold tracking-widest text-slate-900">
                REÇU DE PAIEMENT
              </div>
            </div>

            <div className="grid grid-cols-2 gap-y-1 text-sm mb-4">
              <div className="text-slate-500">Élève</div>
              <div className="font-semibold text-right text-slate-900">
                {receipt.student ? `${receipt.student.nom} ${receipt.student.postnom || ""} ${receipt.student.prenom || ""}` : "—"}
              </div>
              <div className="text-slate-500">Matricule</div>
              <div className="font-mono text-right text-slate-800">{receipt.student?.matricule}</div>
              <div className="text-slate-500">Classe</div>
              <div className="text-right text-slate-800">{receipt.class_name}</div>
              <div className="text-slate-500">Date</div>
              <div className="text-right text-slate-800">{d.toLocaleDateString("fr-FR")} {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</div>
            </div>

            <table className="w-full text-sm border border-slate-300">
              <thead>
                <tr className="bg-slate-100">
                  <th className="text-left px-3 py-2 border-b border-slate-300">Rubrique</th>
                  <th className="text-right px-3 py-2 border-b border-slate-300">Montant</th>
                </tr>
              </thead>
              <tbody>
                {receipt.allocations.map((a, i) => (
                  <tr key={i} className="border-b border-slate-200">
                    <td className="px-3 py-2 text-slate-700">{a.label}</td>
                    <td className="px-3 py-2 text-right font-mono text-slate-900">{money(a.amount)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-indigo-50">
                  <td className="px-3 py-2 font-bold text-slate-900">TOTAL PAYÉ</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-indigo-800">{money(receipt.total_amount)}</td>
                </tr>
              </tfoot>
            </table>

            <p className="text-xs text-slate-600 mt-2 italic">
              Arrêté le présent reçu à la somme de {numberToFrenchWords(receipt.total_amount)}.
            </p>

            <div className="flex justify-between items-end mt-8">
              <div className="text-center">
                <div className="h-12 border-b border-slate-400 w-32" />
                <div className="text-[11px] text-slate-500 mt-1">Le Comptable</div>
              </div>
              <div className="h-16 w-16 rounded-full border-2 border-indigo-300 grid place-items-center text-[9px] text-indigo-400 text-center leading-tight rotate-[-12deg]">
                CACHET<br />ÉCOLE<br />D'ÉTAT
              </div>
            </div>
          </div>
        </div>

        <div className="no-print flex gap-2 p-4 border-t border-slate-200">
          <button onClick={onClose} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 text-sm font-medium hover:bg-slate-50">
            <X className="h-4 w-4" /> Fermer
          </button>
          <button onClick={() => window.print()} data-testid="btn-print-receipt" className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            <Printer className="h-4 w-4" /> Imprimer / PDF
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
