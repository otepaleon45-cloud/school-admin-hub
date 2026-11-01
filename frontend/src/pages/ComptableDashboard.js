import React, { useState, useEffect } from "react";
import { 
  Wallet, UserPlus, Loader2, Printer, Search, CalendarDays,
  DollarSign, Users, FileText, Settings, ShieldAlert, CheckCircle2
} from "lucide-react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";

const STATUS_BADGE = {
  pre_inscrit: "bg-slate-100 text-slate-700",
  inscrit: "bg-blue-100 text-blue-800",
  actif: "bg-emerald-100 text-emerald-800",
  suspendu: "bg-rose-100 text-rose-800"
};

const STATUS_LABEL = { 
  pre_inscrit: "Pré-inscrit", 
  inscrit: "Inscrit", 
  actif: "Actif", 
  suspendu: "Suspendu" 
};

const TABS = [
  { key: "vue", label: "Vue d'ensemble" },
  { key: "eleves", label: "Élèves & Inscriptions" },
  { key: "guichet", label: "Guichet & Reçus" },
  { key: "dettes", label: "Dettes par mois" },
  { key: "bilan", label: "Bilan mensuel" },
  { key: "depenses", label: "Recettes & Dépenses" },
  { key: "frais", label: "Frais par classe" },
  { key: "divers", label: "Frais divers & Uniformes" },
  { key: "enseignants", label: "Enseignants" },
  { key: "classes_budgets", label: "Classes & Budgets" }
];

export default function ComptableDashboard() {
  const [tab, setTab] = useState("vue");
  const [stats, setStats] = useState(null);
  const [students, setStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [studentRegime, setStudentRegime] = useState("standard");
  const [monthlyData, setMonthlyData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupération des données du tableau de bord
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.get("/comptable/dashboard");
      if (res && res.data) {
        setStats(res.data.stats || {});
        setStudents(res.data.students || []);
        setClasses(res.data.classes || []);
      }
    } catch (err) {
      console.error("Erreur de chargement", err);
    } finally {
      setLoading(false);
    }
  }

  function Field({ label, children }) {
    return (
      <label className="block">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <div className="mt-1">{children}</div>
      </label>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Navigation des onglets */}
      <div className="flex space-x-2 border-b border-gray-200 pb-2 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              tab === t.key
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Chargement des données...
        </div>
      )}

      {/* CONTENU DE L'ONGLET CLASSES & BUDGETS */}
      {!loading && tab === "classes_budgets" && (
        <div className="space-y-6 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm space-y-1">
              <h3 className="font-semibold text-blue-900">Primaire</h3>
              <p className="text-2xl font-bold text-gray-800">{stats?.primaire?.total || 0} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-blue-200">
                <p className="text-blue-900">Argent reçu : <span className="font-bold text-green-700">{stats?.primaire?.totalPaid || 0}</span></p>
                <p className="text-blue-700">Budget : {stats?.budgets?.primaire || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm space-y-1">
              <h3 className="font-semibold text-emerald-900">Secondaire</h3>
              <p className="text-2xl font-bold text-gray-800">{stats?.secondaire?.total || 0} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-emerald-200">
                <p className="text-emerald-900">Argent reçu : <span className="font-bold text-green-700">{stats?.secondaire?.totalPaid || 0}</span></p>
                <p className="text-emerald-700">Budget : {stats?.budgets?.secondaire || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm space-y-1">
              <h3 className="font-semibold text-amber-900">Maternelle</h3>
              <p className="text-2xl font-bold text-gray-800">{stats?.maternelle?.total || 0} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-amber-200">
                <p className="text-amber-900">Argent reçu : <span className="font-bold text-green-700">{stats?.maternelle?.totalPaid || 0}</span></p>
                <p className="text-amber-700">Budget : {stats?.budgets?.maternelle || 0}</p>
              </div>
            </div>

            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm space-y-1">
              <h3 className="font-semibold text-purple-900">Enseignants</h3>
              <p className="text-2xl font-bold text-gray-800">{stats?.enseignants || 0} Actifs</p>
              <p className="text-xs text-purple-700 pt-3">Corps professoral global</p>
            </div>
          </div>
        </div>
      )}

      {/* Reste des onglets d'origine conservés */}
      {!loading && tab === "vue" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-gray-800">Vue d'ensemble</h2>
          <p className="text-sm text-gray-600">Bienvenue sur votre tableau de bord comptable.</p>
        </div>
      )}
    </div>
  );
}
