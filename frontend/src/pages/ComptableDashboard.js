import React, { useState, useEffect } from "react";
import api, { money, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Users, DollarSign, BookOpen, Edit3, X, Save } from "lucide-react";

export default function ComptableDashboard() {
  const [stats, setStats] = useState({
    primaire: { total: 0, classes: {} },
    secondaire: { total: 0, classes: {} },
    maternelle: { total: 0, classes: {} },
    enseignants: 0,
    budgets: { primaire: 0, secondaire: 0, maternelle: 0 },
    studentsList: []
  });
  const [selectedClassData, setSelectedClassData] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");
  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/students"); // Récupération de tous les élèves pour calculs et affichage
      const students = res.data || [];

      // Calcul des effectifs par département et par classe
      let primaireTotal = 0, secondaireTotal = 0, maternelleTotal = 0;
      let primaireClasses = {}, secondaireClasses = {}, maternelleClasses = {};

      students.forEach(st => {
        const section = (st.section || "").toLowerCase();
        const className = st.className || "Non classé";

        if (section.includes("primaire")) {
          primaireTotal++;
          if (!primaireClasses[className]) primaireClasses[className] = [];
          primaireClasses[className].push(st);
        } else if (section.includes("secondaire")) {
          secondaireTotal++;
          if (!secondaireClasses[className]) secondaireClasses[className] = [];
          secondaireClasses[className].push(st);
        } else if (section.includes("maternelle")) {
          maternelleTotal++;
          if (!maternelleClasses[className]) maternelleClasses[className] = [];
          maternelleClasses[className].push(st);
        }
      });

      // Récupération du nombre d'enseignants
      let teachersCount = 0;
      try {
        const tRes = await api.get("/teachers");
        teachersCount = (tRes.data || []).length;
      } catch (e) {
        // Ignorer si l'endpoint teachers n'est pas critique
      }

      setStats({
        primaire: { total: primaireTotal, classes: primaireClasses },
        secondaire: { total: secondaireTotal, classes: secondaireClasses },
        maternelle: { total: maternelleTotal, classes: maternelleClasses },
        enseignants: teachersCount,
        budgets: {
          primaire: primaireTotal * 120, // Exemple de calcul budgétaire modifiable
          secondaire: secondaireTotal * 200,
          maternelle: maternelleTotal * 90
        },
        studentsList: students
      });
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/students/${editingStudent._id || editingStudent.id}`, {
        name: editingStudent.name,
        age: Number(editingStudent.age),
        paidAmount: Number(editingStudent.paidAmount)
      });
      toast.success("Informations de l'élève modifiées avec succès !");
      setEditingStudent(null);
      fetchDashboardData();
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail));
    }
  };

  const showClassStudents = (className, studentsList) => {
    setSelectedClassName(className);
    setSelectedClassData(studentsList);
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement du tableau de bord...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tableau de Bord Financier & Administratif</h1>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700"
        >
          Actualiser
        </button>
      </div>

      {/* 1. Compteurs globaux et Budgets par département */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-blue-900">Primaire</h3>
            <BookOpen className="text-blue-600" size={24} />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.primaire.total} élèves</p>
          <p className="text-sm text-blue-700 mt-1">Budget requis : {money(stats.budgets.primaire)}</p>
        </div>

        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-emerald-900">Secondaire</h3>
            <BookOpen className="text-emerald-600" size={24} />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.secondaire.total} élèves</p>
          <p className="text-sm text-emerald-700 mt-1">Budget requis : {money(stats.budgets.secondaire)}</p>
        </div>

        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-amber-900">Maternelle</h3>
            <BookOpen className="text-amber-600" size={24} />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.maternelle.total} élèves</p>
          <p className="text-sm text-amber-700 mt-1">Budget requis : {money(stats.budgets.maternelle)}</p>
        </div>

        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-purple-900">Enseignants</h3>
            <Users className="text-purple-600" size={24} />
          </div>
          <p className="text-2xl font-bold mt-2">{stats.enseignants} Actifs</p>
          <p className="text-sm text-purple-700 mt-1">Corps professoral</p>
        </div>
      </div>

      {/* 2. Boutons par classe pour voir les effectifs et la liste */}
      <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
        <h2 className="text-lg font-bold text-gray-800">Accès Rapide par Classe</h2>
        
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-semibold text-blue-800 mb-2">Classes du Primaire</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(stats.primaire.classes).length === 0 ? (
                <p className="text-sm text-gray-500">Aucune classe enregistrée</p>
              ) : (
                Object.entries(stats.primaire.classes).map(([className, list]) => (
                  <button
                    key={className}
                    onClick={() => showClassStudents(`Primaire - ${className}`, list)}
                    className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <span>{className}</span>
                    <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs">{list.length}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-emerald-800 mb-2">Classes du Secondaire</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(stats.secondaire.classes).length === 0 ? (
                <p className="text-sm text-gray-500">Aucune classe enregistrée</p>
              ) : (
                Object.entries(stats.secondaire.classes).map(([className, list]) => (
                  <button
                    key={className}
                    onClick={() => showClassStudents(`Secondaire - ${className}`, list)}
                    className="px-4 py-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <span>{className}</span>
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs">{list.length}</span>
                  </button>
                ))
              )}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-amber-800 mb-2">Classes de la Maternelle</h4>
            <div className="flex flex-wrap gap-2">
              {Object.keys(stats.maternelle.classes).length === 0 ? (
                <p className="text-sm text-gray-500">Aucune classe enregistrée</p>
              ) : (
                Object.entries(stats.maternelle.classes).map(([className, list]) => (
                  <button
                    key={className}
                    onClick={() => showClassStudents(`Maternelle - ${className}`, list)}
                    className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                  >
                    <span>{className}</span>
                    <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-xs">{list.length}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal d'affichage de la liste des élèves d'une classe */}
      {selectedClassName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800">Liste de la salle : {selectedClassName}</h3>
              <button onClick={() => setSelectedClassName("")} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-2">
              {selectedClassData?.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Aucun élève dans cette classe.</p>
              ) : (
                selectedClassData?.map((student) => (
                  <div 
                    key={student._id || student.id}
                    onClick={() => { setEditingStudent(student); setSelectedClassName(""); }}
                    className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer flex justify-between items-center transition"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{student.name}</p>
                      <p className="text-xs text-gray-500">Âge : {student.age} ans</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{money(student.paidAmount)}</p>
                      <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <Edit3 size={12} /> Modifier
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 text-right rounded-b-xl">
              <button 
                onClick={() => setSelectedClassName("")}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de modification des informations d'un élève (Nom, Âge, Montant payé) */}
      {editingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={handleUpdateStudent} className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">Modifier l'élève</h3>
              <button type="button" onClick={() => setEditingStudent(null)} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nom complet</label>
                <input
                  type="text"
                  value={editingStudent.name || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                  className="w-full border p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Âge</label>
                <input
                  type="number"
                  value={editingStudent.age || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, age: e.target.value })}
                  className="w-full border p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Montant payé</label>
                <input
                  type="number"
                  value={editingStudent.paidAmount || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, paidAmount: e.target.value })}
                  className="w-full border p-2.5 rounded-lg mt-1 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setEditingStudent(null)}
                className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save size={16} /> Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
