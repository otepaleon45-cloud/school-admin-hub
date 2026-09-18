# ScolarEtat — Système de Gestion Scolaire d'État

## Problème / Objectif
Système de gestion d'un établissement scolaire d'état général, avec 3 rôles: Administrateur, Comptable, Enseignant. Interface en français, devise USD ($), auth JWT (email + mot de passe), classes + sections + 3 trimestres, reçus & bulletins imprimables (PDF via impression navigateur).

## Personas
- **Administrateur** (otepaleon45@gmail.com): vision globale, inventaire financier (honoraires enseignants), résultats par classe/section, réclamations, gestion des utilisateurs.
- **Comptable** (comptable@scolaretat.cd): inscriptions élèves, guichet de paiement avec répartition (inscription / frais T1/T2/T3), reçus, recettes & dépenses.
- **Enseignant** (enseignant@scolaretat.cd, PIN 1234): mes classes/matières, évaluations, cahier de cotations (moyennes automatiques), bulletins.

## Architecture
- Backend: FastAPI + MongoDB (motor), JWT (bearer), bcrypt. Fichier unique `/app/backend/server.py`.
- Frontend: React 19 + Tailwind + shadcn/ui. Pages par rôle + AuthContext + Layout (sidebar/topbar).
- Impression: `window.print()` + CSS `@media print` (classe `.print-area`).

## Modèle de données (collections)
users, classes, students, payments, expenses, subjects, evaluations, grades, reclamations, teacher_payments.

## Implémenté (2026-06-18)
- Auth JWT multi-rôles + seed idempotent (admin/comptable/2 enseignants).
- Dashboard Admin: KPIs (élèves, classes, recettes, dépenses, solde, dettes élèves & enseignants, réclamations), graphe finances.
- Inventaire financier + paiement des honoraires enseignants.
- Résultats scolaires par classe/trimestre (rang, moyenne, mention, taux réussite) + bulletin.
- Réclamations (liste + résolution).
- Gestion utilisateurs (création/suppression).
- Comptable: liste élèves + inscription, guichet paiement avec répartition intelligente, reçu imprimable (N° quittance), historique paiements, recettes & dépenses.
- Enseignant: mes classes/matières, création matière, cahier de cotations éditable avec moyennes pondérées auto (/20), création d'évaluations, bulletins officiels auto-générés imprimables.
- Données pré-remplies (3 classes, 10 élèves, paiements, dépenses, 4 matières avec évaluations+cotes, 2 réclamations).

## Backlog (P1/P2)
- P1: Fiches synthétiques trimestrielles + bouton "Transmettre à la direction".
- P1: PIN d'accès enseignant réel (gate) au cahier de cotes.
- P2: Export CSV recettes/dépenses; pagination listes; agrégations MongoDB pour dashboards (perf).
- P2: Historique multi-années; gestion présences; notifications réclamations.

## Notes techniques (dette)
- Dashboards recalculent séquentiellement (O(N)); à optimiser via agrégation à grande échelle.
- Migrer `@app.on_event` vers lifespan handlers (FastAPI récent).

## 2026-06 — Bouton Retour
- Bouton « Retour » (data-testid btn-back) dans l en-tête de chaque page (Layout.js), revient à l onglet/page précédent via l historique.
- Onglets synchronisés avec l URL (?tab=...) via hooks/useTab.js.

## 2026-06 — Remise à zéro
- Toutes les données de démo (classes, élèves, paiements, dépenses, matières, évaluations, cotes, réclamations, paies profs, prof2) supprimées.
- seed() ne crée plus que les 3 comptes utilisateurs (admin, comptable, enseignant). Système vierge.

## 2026-06 — Page de connexion simplifiée
- Trois boutons uniquement (Administrateur, Comptable, Enseignant). Admin et Enseignant demandent un code à 4 chiffres ; Comptable entre directement.
- Backend: POST /api/auth/role-login ; ADMIN_ACCESS_CODE ajouté au .env.

## 2026-06 — Identité école + classes
- École : Complexe Scolaire St. Joseph du Grand Lac (C.S.J.G.L), Kamanyola, école privée agréée. Logo dans /frontend/public/logo.png (accueil, sidebar, reçus, bulletins).
- 31 classes créées au démarrage (seed_classes) : Maternel 1er-3e niveau, Primaire 1ère-6e année, Éducation de base 7e-8e, Humanités 1ère-4e × 5 options (Pédagogie générale, Technique sociale, Commerciale de Gestion, Électricité, Agronomie). Frais à 0$ à définir par le comptable.

## 2026-06 — Frais par classe, édition comptes, paramètres
- Comptable : onglet « Frais par classe » (PUT /api/classes/{id}) — inscription + T1/T2/T3 par classe, dette élève auto.
- Guichet et tableau admin : détail des paiements (nom élève + montant par rubrique). Admin dashboard renvoie derniers_paiements.
- Admin : édition des comptes (PUT /api/users/{id}) — nom, code 4 chiffres (unique), salaire, mot de passe.
- Admin : onglet « Paramètres » (GET/PUT /api/settings) — nom école, sigle, ville, année scolaire, liste des options. Utilisé par Layout, reçus, bulletins (hooks/useSettings.js).

## 2026-06 — Suppressions + enseignants (comptable)
- DELETE /api/students/{id} (admin, comptable) : supprime élève + paiements + cotes. Bouton 🗑 dans la liste des élèves.
- DELETE /api/users/{id} : admin (non-admin) ou comptable (enseignants seulement). Bouton 🗑 dans l inventaire admin et onglet Enseignants.
- Comptable → onglet « Enseignants » : GET/POST /api/teachers (nom, tél, code 4 chiffres, salaire, période mois|trimestre). Dû annuel = salaire×10 mois ou ×3 trimestres.
