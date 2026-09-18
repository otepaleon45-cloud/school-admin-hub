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
