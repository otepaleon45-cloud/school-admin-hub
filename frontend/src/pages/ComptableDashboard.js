import React, { useState, useEffect } from "react";
import api, { money, formatApiError } from "@/lib/api";
import { toast } from "sonner";
import { Users, DollarSign, BookOpen, Edit3, X, Save, TrendingDown, Scale, PlusCircle, Receipt, Trash2, UserPlus, Loader2, Printer, Search, CalendarDays } from "lucide-react";

export default function ComptableDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState({
    primaire: { total: 0, totalPaid: 0, classes: {} },
    secondaire: { total: 0, totalPaid: 0, classes: {} },
    maternelle: { total: 0, totalPaid: 0, classes: {} },
    enseignants: 0,
    budgets: { primaire: 0, secondaire: 0, maternelle: 0 },
    studentsList: [],
    teachersList: [],
    teachersBySubject: {}
  });

  const [selectedClassData, setSelectedClassData] = useState(null);
  const [selectedClassName, setSelectedClassName] = useState("");
  
  const [selectedTeacherData, setSelectedTeacherData] = useState(null);
  const [selectedTeacherCategory, setSelectedTeacherCategory] = useState("");

  const [editingStudent, setEditingStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/students");
      const students = res.data || [];

      let primaireTotal = 0, primairePaid = 0, primaireClasses = {};
      let secondaireTotal = 0, secondairePaid = 0, secondaireClasses = {};
      let maternelleTotal = 0, maternellePaid = 0, maternelleClasses = {};

      students.forEach(st => {
        const section = (st.section || "").toLowerCase();
        const className = st.className || "Non classé";
        const amount = Number(st.paidAmount || st.montantPaye || 0);

        if (section.includes("primaire")) {
          primaireTotal++;
          primairePaid += amount;
          if (!primaireClasses[className]) primaireClasses[className] = [];
          primaireClasses[className].push(st);
        } else if (section.includes("secondaire")) {
          secondaireTotal++;
          secondairePaid += amount;
          if (!secondaireClasses[className]) secondaireClasses[className] = [];
          secondaireClasses[className].push(st);
        } else if (section.includes("maternelle")) {
          maternelleTotal++;
          maternellePaid += amount;
          if (!maternelleClasses[className]) maternelleClasses[className] = [];
          maternelleClasses[className].push(st);
        }
      });

      let teachersList = [];
      let teachersBySubject = {};
      try {
        const tRes = await api.get("/teachers");
        teachersList = tRes.data || [];
        teachersList.forEach(t => {
          const subject = t.subject || t.cours || t.matiere || "Général";
          if (!teachersBySubject[subject]) teachersBySubject[subject] = [];
          teachersBySubject[subject].push(t);
        });
      } catch (e) {
        // Ignorer si l'endpoint teachers n'est pas dispo
      }

      setStats({
        primaire: { total: primaireTotal, totalPaid: primairePaid, classes: primaireClasses },
        secondaire: { total: secondaireTotal, totalPaid: secondairePaid, classes: secondaireClasses },
        maternelle: { total: maternelleTotal, totalPaid: maternellePaid, classes: maternelleClasses },
        enseignants: teachersList.length,
        budgets: {
          primaire: primaireTotal * 120,
          secondaire: secondaireTotal * 200,
          maternelle: maternelleTotal * 90
        },
        studentsList: students,
        teachersList: teachersList,
        teachersBySubject: teachersBySubject
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

  const showClassStudents = (className, list) => {
    setSelectedClassName(className);
    setSelectedClassData(list);
  };

  const showTeacherCategory = (categoryName, list) => {
    setSelectedTeacherCategory(categoryName);
    setSelectedTeacherData(list);
  };

  if (loading) {
    return <div className="p-8 text-center">Chargement du tableau de bord...</div>;
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Espace Comptable</h1>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 text-sm font-medium"
        >
          Actualiser
        </button>
      </div>

      {/* Barre de navigation des onglets (Anciens onglets + le nouveau) */}
      <div className="flex flex-wrap gap-2 border-b pb-3">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === "overview" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 hover:bg-gray-100 border"
          }`}
        >
          Vue d'ensemble
        </button>
        <button
          onClick={() => setActiveTab("classes_budgets")}
          className={`px-4 py-2 text-sm font-medium rounded-lg transition ${
            activeTab === "classes_budgets" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 hover:bg-gray-100 border"
          }`}
        >
          Classes & Budgets
        </button>
        {/* Vous pouvez garder ou retrouver vos autres onglets ici selon vos besoins */}
      </div>

      {/* CONTENU DE L'ONGLET VUE D'ENSEMBLE (ORIGINAL) */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-5 bg-white border rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">TOTAL ÉLÈVES</h3>
            <p className="text-3xl font-bold text-gray-800 mt-1">{stats.studentsList.length}</p>
          </div>
          <div className="p-5 bg-white border rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">RECETTES GLOBALES</h3>
            <p className="text-3xl font-bold text-emerald-600 mt-1">
              {money(stats.primaire.totalPaid + stats.secondaire.totalPaid + stats.maternelle.totalPaid)}
            </p>
          </div>
          <div className="p-5 bg-white border rounded-xl shadow-sm">
            <h3 className="text-sm font-medium text-gray-500">ENSEIGNANTS ACTIFS</h3>
            <p className="text-3xl font-bold text-purple-600 mt-1">{stats.enseignants}</p>
          </div>
        </div>
      )}

      {/* CONTENU DU NOUVEL ONGLET : CLASSES & BUDGETS */}
      {activeTab === "classes_budgets" && (
        <div className="space-y-6">
          {/* 1. Totaux par département, Argent reçu & Budgets */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Primaire */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-blue-900">Primaire</h3>
                <BookOpen className="text-blue-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.primaire.total} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-blue-200">
                <p className="text-blue-900">
                  Argent reçu : <span className="font-bold text-green-700">{money(stats.primaire.totalPaid)}</span>
                </p>
                <p className="text-blue-700">Budget requis : {money(stats.budgets.primaire)}</p>
              </div>
            </div>

            {/* Secondaire */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-emerald-900">Secondaire</h3>
                <BookOpen className="text-emerald-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.secondaire.total} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-emerald-200">
                <p className="text-emerald-900">
                  Argent reçu : <span className="font-bold text-green-700">{money(stats.secondaire.totalPaid)}</span>
                </p>
                <p className="text-emerald-700">Budget requis : {money(stats.budgets.secondaire)}</p>
              </div>
            </div>

            {/* Maternelle */}
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-amber-900">Maternelle</h3>
                <BookOpen className="text-amber-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.maternelle.total} élèves</p>
              <div className="text-xs space-y-1 pt-2 border-t border-amber-200">
                <p className="text-amber-900">
                  Argent reçu : <span className="font-bold text-green-700">{money(stats.maternelle.totalPaid)}</span>
                </p>
                <p className="text-amber-700">Budget requis : {money(stats.budgets.maternelle)}</p>
              </div>
            </div>

            {/* Enseignants */}
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-purple-900">Enseignants</h3>
                <Users className="text-purple-600" size={20} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{stats.enseignants} Actifs</p>
              <p className="text-xs text-purple-700 pt-3">Corps professoral global</p>
            </div>
          </div>

          {/* 2. Boutons d'accès rapide par Classe (Élèves) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Accès Rapide par Classe (Élèves)</h2>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-semibold text-blue-800 uppercase tracking-wider mb-2">Primaire</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.primaire.classes).map(([className, list]) => (
                    <button
                      key={className}
                      onClick={() => showClassStudents(`Primaire - ${className}`, list)}
                      className="px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <span>{className}</span>
                      <span className="bg-blue-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{list.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-emerald-800 uppercase tracking-wider mb-2">Secondaire</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.secondaire.classes).map(([className, list]) => (
                    <button
                      key={className}
                      onClick={() => showClassStudents(`Secondaire - ${className}`, list)}
                      className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <span>{className}</span>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{list.length}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-2">Maternelle</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.maternelle.classes).map(([className, list]) => (
                    <button
                      key={className}
                      onClick={() => showClassStudents(`Maternelle - ${className}`, list)}
                      className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <span>{className}</span>
                      <span className="bg-amber-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{list.length}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 3. Boutons d'accès rapide par Enseignants (Matières / Salles) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Accès Rapide par Enseignants</h2>
            <div>
              <h4 className="text-xs font-semibold text-purple-800 uppercase tracking-wider mb-2">Par Matière / Cours</h4>
              <div className="flex flex-wrap gap-2">
                {Object.keys(stats.teachersBySubject).length === 0 ? (
                  <p className="text-sm text-gray-500">Aucun enseignant enregistré</p>
                ) : (
                  Object.entries(stats.teachersBySubject).map(([subject, list]) => (
                    <button
                      key={subject}
                      onClick={() => showTeacherCategory(`Matière : ${subject}`, list)}
                      className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 rounded-lg text-sm font-medium transition flex items-center gap-2"
                    >
                      <span>{subject}</span>
                      <span className="bg-purple-600 text-white px-2 py-0.5 rounded-full text-xs font-bold">{list.length}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'affichage de la liste des élèves d'une classe (avec clic pour modifier) */}
      {selectedClassName && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-gray-800">Classe : {selectedClassName}</h3>
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
                      <p className="text-sm font-bold text-green-600">{money(student.paidAmount || student.montantPaye || 0)}</p>
                      <span className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                        <Edit3 size={12} /> Modifier
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 text-right rounded-b-xl">
              <button onClick={() => setSelectedClassName("")} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm">
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal d'affichage de la liste des enseignants (Salaire, Salle, Cours) */}
      {selectedTeacherCategory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center bg-purple-50 rounded-t-xl">
              <h3 className="font-bold text-lg text-purple-900">{selectedTeacherCategory}</h3>
              <button onClick={() => setSelectedTeacherCategory("")} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {selectedTeacherData?.length === 0 ? (
                <p className="text-center text-gray-500 py-4">Aucun enseignant dans cette catégorie.</p>
              ) : (
                selectedTeacherData?.map((teacher) => (
                  <div key={teacher._id || teacher.id} className="p-4 border rounded-xl bg-gray-50 flex justify-between items-center shadow-sm">
                    <div className="space-y-1">
                      <p className="font-bold text-gray-800 text-base">{teacher.name || teacher.nom}</p>
                      <p className="text-xs text-gray-600 flex items-center gap-2">
                        <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Salle : {teacher.classroom || teacher.salle || "Non assignée"}</span>
                        <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">Cours : {teacher.subject || teacher.cours || "N/A"}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Salaire</p>
                      <p className="text-base font-bold text-emerald-600">{money(teacher.salary || teacher.salaire || 0)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 text-right rounded-b-xl">
              <button onClick={() => setSelectedTeacherCategory("")} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
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
                  className="w-full border p-2.5 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Âge</label>
                <input
                  type="number"
                  value={editingStudent.age || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, age: e.target.value })}
                  className="w-full border p-2.5 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Montant payé</label>
                <input
                  type="number"
                  value={editingStudent.paidAmount || editingStudent.montantPaye || ""}
                  onChange={(e) => setEditingStudent({ ...editingStudent, paidAmount: e.target.value })}
                  className="w-full border p-2.5 rounded-lg mt-1 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
              <button type="button" onClick={() => setEditingStudent(null)} className="px-4 py-2 border rounded-lg text-gray-600 hover:bg-gray-100">
                Annuler
              </button>
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Save size={16} /> Enregistrer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
