from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, BeforeValidator
from typing import List, Optional, Annotated, Any
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import logging
import bcrypt
import jwt

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI(title="ScolarEtat API")
api_router = APIRouter(prefix="/api")

JWT_ALGORITHM = "HS256"

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("scolaretat")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
PyObjectId = Annotated[str, BeforeValidator(str)]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def oid(v: str) -> ObjectId:
    return ObjectId(v)


def clean(doc: dict) -> dict:
    """Convert Mongo doc _id -> id (str) and stringify ObjectIds."""
    if not doc:
        return doc
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
    doc.pop("password_hash", None)
    return doc


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "access",
    }
    return jwt.encode(payload, os.environ["JWT_SECRET"], algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Non authentifié")
    try:
        payload = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="Utilisateur introuvable")
        return clean(user)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expirée")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Jeton invalide")


def require_roles(*roles):
    async def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="Accès refusé pour ce rôle")
        return user
    return checker


# ---------------------------------------------------------------------------
# Pydantic payload models
# ---------------------------------------------------------------------------
class LoginBody(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str  # admin | comptable | enseignant
    access_code: Optional[str] = None
    salaire_trimestre: float = 0.0


class ClassCreate(BaseModel):
    name: str
    section: str
    niveau: str = ""
    frais_inscription: float = 0.0
    frais_t1: float = 0.0
    frais_t2: float = 0.0
    frais_t3: float = 0.0


class StudentCreate(BaseModel):
    matricule: Optional[str] = None
    nom: str
    postnom: str = ""
    prenom: str = ""
    genre: str = "M"
    date_naissance: str = ""
    class_id: str
    tuteur_nom: str = ""
    tuteur_contact: str = ""
    status: str = "pre_inscrit"


class PaymentBody(BaseModel):
    student_id: str
    allocations: List[dict]  # [{category, amount}]
    note: str = ""


class ExpenseCreate(BaseModel):
    category: str
    amount: float
    description: str = ""
    date: Optional[str] = None


class SubjectCreate(BaseModel):
    name: str
    class_id: str
    teacher_id: Optional[str] = None
    coefficient: float = 1.0


class EvaluationCreate(BaseModel):
    subject_id: str
    type: str = "Interrogation"
    title: str = ""
    note_max: float = 20.0
    coefficient: float = 1.0
    trimestre: int = 1
    date: Optional[str] = None


class GradeBody(BaseModel):
    evaluation_id: str
    grades: List[dict]  # [{student_id, value}]


class ReclamationCreate(BaseModel):
    student_id: Optional[str] = None
    sujet: str
    message: str = ""
    priorite: str = "moyenne"


class TeacherPaymentBody(BaseModel):
    teacher_id: str
    amount: float
    trimestre: int = 1
    note: str = ""


# ---------------------------------------------------------------------------
# Auth routes
# ---------------------------------------------------------------------------
@api_router.post("/auth/login")
async def login(body: LoginBody):
    email = body.email.strip().lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")
    token = create_access_token(str(user["_id"]), email, user["role"])
    return {"access_token": token, "user": clean(user)}


class RoleLoginBody(BaseModel):
    role: str
    code: Optional[str] = None


@api_router.post("/auth/role-login")
async def role_login(body: RoleLoginBody):
    if body.role not in ("admin", "comptable", "enseignant"):
        raise HTTPException(status_code=400, detail="Rôle invalide")
    if body.role == "comptable":
        user = await db.users.find_one({"role": "comptable"})
    else:
        code = (body.code or "").strip()
        if len(code) != 4 or not code.isdigit():
            raise HTTPException(status_code=400, detail="Code à 4 chiffres requis")
        user = await db.users.find_one({"role": body.role, "access_code": code})
    if not user:
        raise HTTPException(status_code=401, detail="Code d'accès incorrect")
    token = create_access_token(str(user["_id"]), user["email"], user["role"])
    return {"access_token": token, "user": clean(user)}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


# ---------------------------------------------------------------------------
# Users (admin manages)
# ---------------------------------------------------------------------------
@api_router.get("/users")
async def list_users(user: dict = Depends(require_roles("admin"))):
    docs = await db.users.find().to_list(1000)
    return [clean(d) for d in docs]


@api_router.post("/users")
async def create_user(body: UserCreate, user: dict = Depends(require_roles("admin"))):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email déjà utilisé")
    doc = {
        "name": body.name,
        "email": email,
        "password_hash": hash_password(body.password),
        "role": body.role,
        "access_code": body.access_code,
        "salaire_trimestre": body.salaire_trimestre,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


class UserUpdate(BaseModel):
    name: Optional[str] = None
    password: Optional[str] = None
    access_code: Optional[str] = None
    salaire_trimestre: Optional[float] = None


@api_router.put("/users/{user_id}")
async def update_user(user_id: str, body: UserUpdate, user: dict = Depends(require_roles("admin"))):
    upd = {}
    if body.name:
        upd["name"] = body.name
    if body.password:
        upd["password_hash"] = hash_password(body.password)
    if body.access_code is not None:
        code = body.access_code.strip()
        if code and (len(code) != 4 or not code.isdigit()):
            raise HTTPException(status_code=400, detail="Le code doit contenir 4 chiffres")
        if code and await db.users.find_one({"access_code": code, "_id": {"$ne": oid(user_id)}}):
            raise HTTPException(status_code=400, detail="Ce code est déjà utilisé par un autre compte")
        upd["access_code"] = code or None
    if body.salaire_trimestre is not None:
        upd["salaire_trimestre"] = body.salaire_trimestre
    if upd:
        await db.users.update_one({"_id": oid(user_id)}, {"$set": upd})
    doc = await db.users.find_one({"_id": oid(user_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")
    return clean(doc)


@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, user: dict = Depends(require_roles("admin"))):
    await db.users.delete_one({"_id": oid(user_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Classes
# ---------------------------------------------------------------------------
@api_router.get("/classes")
async def list_classes(user: dict = Depends(get_current_user)):
    docs = await db.classes.find().to_list(1000)
    result = []
    for c in docs:
        c = clean(c)
        c["effectif"] = await db.students.count_documents({"class_id": c["id"]})
        result.append(c)
    return result


@api_router.post("/classes")
async def create_class(body: ClassCreate, user: dict = Depends(require_roles("admin", "comptable"))):
    doc = body.model_dump()
    doc["created_at"] = now_iso()
    res = await db.classes.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.put("/classes/{class_id}")
async def update_class(class_id: str, body: ClassCreate, user: dict = Depends(require_roles("admin", "comptable"))):
    await db.classes.update_one({"_id": oid(class_id)}, {"$set": body.model_dump()})
    doc = await db.classes.find_one({"_id": oid(class_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Classe introuvable")
    return clean(doc)


@api_router.delete("/classes/{class_id}")
async def delete_class(class_id: str, user: dict = Depends(require_roles("admin"))):
    await db.classes.delete_one({"_id": oid(class_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Students + fee helpers
# ---------------------------------------------------------------------------
FEE_CATEGORIES = ["inscription", "t1", "t2", "t3"]
FEE_LABELS = {
    "inscription": "Frais d'inscription",
    "t1": "Frais scolaires T1",
    "t2": "Frais scolaires T2",
    "t3": "Frais scolaires T3",
}


async def student_ledger(student: dict) -> dict:
    cls = await db.classes.find_one({"_id": oid(student["class_id"])}) if student.get("class_id") else None
    fees = {
        "inscription": cls.get("frais_inscription", 0) if cls else 0,
        "t1": cls.get("frais_t1", 0) if cls else 0,
        "t2": cls.get("frais_t2", 0) if cls else 0,
        "t3": cls.get("frais_t3", 0) if cls else 0,
    }
    paid = {c: 0.0 for c in FEE_CATEGORIES}
    payments = await db.payments.find({"student_id": str(student["_id"])}).to_list(1000)
    for p in payments:
        for a in p.get("allocations", []):
            if a["category"] in paid:
                paid[a["category"]] += float(a["amount"])
    total_due = sum(fees.values())
    total_paid = sum(paid.values())
    return {
        "fees": fees,
        "paid": paid,
        "reste": {c: round(fees[c] - paid[c], 2) for c in FEE_CATEGORIES},
        "total_due": round(total_due, 2),
        "total_paid": round(total_paid, 2),
        "dette": round(total_due - total_paid, 2),
    }


@api_router.get("/students")
async def list_students(class_id: Optional[str] = None, user: dict = Depends(get_current_user)):
    q = {}
    if class_id:
        q["class_id"] = class_id
    docs = await db.students.find(q).to_list(2000)
    result = []
    for s in docs:
        ledger = await student_ledger(s)
        s = clean(s)
        s["ledger"] = ledger
        result.append(s)
    return result


@api_router.get("/students/{student_id}")
async def get_student(student_id: str, user: dict = Depends(get_current_user)):
    s = await db.students.find_one({"_id": oid(student_id)})
    if not s:
        raise HTTPException(status_code=404, detail="Élève introuvable")
    ledger = await student_ledger(s)
    payments = await db.payments.find({"student_id": student_id}).sort("date", -1).to_list(1000)
    s = clean(s)
    s["ledger"] = ledger
    s["payments"] = [clean(p) for p in payments]
    return s


@api_router.post("/students")
async def create_student(body: StudentCreate, user: dict = Depends(require_roles("admin", "comptable"))):
    doc = body.model_dump()
    if not doc.get("matricule"):
        count = await db.students.count_documents({})
        doc["matricule"] = f"MAT-{datetime.now().year}-{count + 1:04d}"
    doc["created_at"] = now_iso()
    doc["year"] = "2025-2026"
    res = await db.students.insert_one(doc)
    doc["_id"] = res.inserted_id
    s = clean(doc)
    s["ledger"] = await student_ledger({**doc})
    return s


@api_router.put("/students/{student_id}")
async def update_student(student_id: str, body: StudentCreate, user: dict = Depends(require_roles("admin", "comptable"))):
    doc = body.model_dump()
    doc.pop("matricule", None) if not doc.get("matricule") else None
    await db.students.update_one({"_id": oid(student_id)}, {"$set": {k: v for k, v in doc.items() if v is not None}})
    s = await db.students.find_one({"_id": oid(student_id)})
    return clean(s)


@api_router.post("/students/{student_id}/status")
async def set_status(student_id: str, payload: dict, user: dict = Depends(require_roles("admin", "comptable"))):
    await db.students.update_one({"_id": oid(student_id)}, {"$set": {"status": payload.get("status", "inscrit")}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Payments (comptable) + receipts
# ---------------------------------------------------------------------------
@api_router.get("/fee-categories")
async def fee_categories(user: dict = Depends(get_current_user)):
    return [{"key": k, "label": FEE_LABELS[k]} for k in FEE_CATEGORIES]


@api_router.post("/payments")
async def create_payment(body: PaymentBody, user: dict = Depends(require_roles("admin", "comptable"))):
    student = await db.students.find_one({"_id": oid(body.student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Élève introuvable")
    allocations = [a for a in body.allocations if float(a.get("amount", 0)) > 0]
    if not allocations:
        raise HTTPException(status_code=400, detail="Aucun montant à répartir")
    total = round(sum(float(a["amount"]) for a in allocations), 2)
    count = await db.payments.count_documents({})
    doc = {
        "student_id": body.student_id,
        "receipt_no": f"QUIT-{datetime.now().year}-{count + 1:05d}",
        "date": now_iso(),
        "total_amount": total,
        "allocations": [{"category": a["category"], "amount": round(float(a["amount"]), 2)} for a in allocations],
        "note": body.note,
        "recorded_by": user["name"],
    }
    res = await db.payments.insert_one(doc)
    doc["_id"] = res.inserted_id
    # auto-activate on first payment
    if student.get("status") in ("pre_inscrit", None):
        await db.students.update_one({"_id": oid(body.student_id)}, {"$set": {"status": "inscrit"}})
    ledger = await student_ledger(student)
    return {"payment": clean(doc), "ledger": ledger}


@api_router.get("/payments")
async def list_payments(user: dict = Depends(require_roles("admin", "comptable"))):
    docs = await db.payments.find().sort("date", -1).to_list(2000)
    result = []
    for p in docs:
        s = await db.students.find_one({"_id": oid(p["student_id"])}) if p.get("student_id") else None
        p = clean(p)
        p["student_name"] = f"{s['nom']} {s.get('postnom','')} {s.get('prenom','')}".strip() if s else "—"
        result.append(p)
    return result


@api_router.get("/receipts/{payment_id}")
async def get_receipt(payment_id: str, user: dict = Depends(require_roles("admin", "comptable"))):
    p = await db.payments.find_one({"_id": oid(payment_id)})
    if not p:
        raise HTTPException(status_code=404, detail="Reçu introuvable")
    s = await db.students.find_one({"_id": oid(p["student_id"])})
    cls = await db.classes.find_one({"_id": oid(s["class_id"])}) if s and s.get("class_id") else None
    p = clean(p)
    p["allocations"] = [{"category": a["category"], "label": FEE_LABELS.get(a["category"], a["category"]), "amount": a["amount"]} for a in p["allocations"]]
    p["student"] = clean(s) if s else None
    p["class_name"] = f"{cls['name']} {cls['section']}" if cls else ""
    return p


# ---------------------------------------------------------------------------
# Expenses
# ---------------------------------------------------------------------------
@api_router.get("/expenses")
async def list_expenses(user: dict = Depends(require_roles("admin", "comptable"))):
    docs = await db.expenses.find().sort("date", -1).to_list(2000)
    return [clean(d) for d in docs]


@api_router.post("/expenses")
async def create_expense(body: ExpenseCreate, user: dict = Depends(require_roles("admin", "comptable"))):
    doc = body.model_dump()
    doc["date"] = doc.get("date") or now_iso()
    doc["recorded_by"] = user["name"]
    res = await db.expenses.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.delete("/expenses/{expense_id}")
async def delete_expense(expense_id: str, user: dict = Depends(require_roles("admin", "comptable"))):
    await db.expenses.delete_one({"_id": oid(expense_id)})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Subjects / Matières
# ---------------------------------------------------------------------------
@api_router.get("/subjects")
async def list_subjects(class_id: Optional[str] = None, teacher_id: Optional[str] = None, mine: bool = False, user: dict = Depends(get_current_user)):
    q = {}
    if class_id:
        q["class_id"] = class_id
    if teacher_id:
        q["teacher_id"] = teacher_id
    if mine and user["role"] == "enseignant":
        q["teacher_id"] = user["id"]
    docs = await db.subjects.find(q).to_list(1000)
    result = []
    for s in docs:
        cls = await db.classes.find_one({"_id": oid(s["class_id"])}) if s.get("class_id") else None
        s = clean(s)
        s["class_name"] = f"{cls['name']} {cls['section']}" if cls else ""
        result.append(s)
    return result


@api_router.post("/subjects")
async def create_subject(body: SubjectCreate, user: dict = Depends(require_roles("admin", "enseignant"))):
    doc = body.model_dump()
    if user["role"] == "enseignant" and not doc.get("teacher_id"):
        doc["teacher_id"] = user["id"]
    doc["created_at"] = now_iso()
    res = await db.subjects.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.delete("/subjects/{subject_id}")
async def delete_subject(subject_id: str, user: dict = Depends(require_roles("admin", "enseignant"))):
    await db.subjects.delete_one({"_id": oid(subject_id)})
    await db.evaluations.delete_many({"subject_id": subject_id})
    return {"ok": True}


@api_router.get("/my-classes")
async def my_classes(user: dict = Depends(require_roles("admin", "enseignant"))):
    tid = user["id"]
    subjects = await db.subjects.find({"teacher_id": tid}).to_list(1000)
    class_ids = {s["class_id"] for s in subjects if s.get("class_id")}
    result = []
    for cid in class_ids:
        cls = await db.classes.find_one({"_id": oid(cid)})
        if not cls:
            continue
        cls = clean(cls)
        cls["effectif"] = await db.students.count_documents({"class_id": cid})
        cls["matieres"] = [clean(s) for s in subjects if s.get("class_id") == cid]
        result.append(cls)
    return result


# ---------------------------------------------------------------------------
# Evaluations + grades (cahier de cotations)
# ---------------------------------------------------------------------------
@api_router.get("/evaluations")
async def list_evaluations(subject_id: Optional[str] = None, trimestre: Optional[int] = None, user: dict = Depends(get_current_user)):
    q = {}
    if subject_id:
        q["subject_id"] = subject_id
    if trimestre:
        q["trimestre"] = trimestre
    docs = await db.evaluations.find(q).sort("date", -1).to_list(1000)
    result = []
    for e in docs:
        e = clean(e)
        e["grades_count"] = await db.grades.count_documents({"evaluation_id": e["id"]})
        result.append(e)
    return result


@api_router.post("/evaluations")
async def create_evaluation(body: EvaluationCreate, user: dict = Depends(require_roles("admin", "enseignant"))):
    doc = body.model_dump()
    doc["date"] = doc.get("date") or now_iso()
    doc["teacher_id"] = user["id"]
    res = await db.evaluations.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.delete("/evaluations/{eval_id}")
async def delete_evaluation(eval_id: str, user: dict = Depends(require_roles("admin", "enseignant"))):
    await db.evaluations.delete_one({"_id": oid(eval_id)})
    await db.grades.delete_many({"evaluation_id": eval_id})
    return {"ok": True}


@api_router.post("/grades")
async def save_grades(body: GradeBody, user: dict = Depends(require_roles("admin", "enseignant"))):
    for g in body.grades:
        if g.get("value") in (None, ""):
            await db.grades.delete_one({"evaluation_id": body.evaluation_id, "student_id": g["student_id"]})
            continue
        await db.grades.update_one(
            {"evaluation_id": body.evaluation_id, "student_id": g["student_id"]},
            {"$set": {"value": float(g["value"]), "updated_at": now_iso()}},
            upsert=True,
        )
    return {"ok": True}


async def compute_subject_average(subject_id: str, student_id: str, trimestre: int) -> Optional[float]:
    """Weighted average of evaluations, normalized to /20."""
    evals = await db.evaluations.find({"subject_id": subject_id, "trimestre": trimestre}).to_list(1000)
    total_w = 0.0
    total_v = 0.0
    for e in evals:
        g = await db.grades.find_one({"evaluation_id": str(e["_id"]), "student_id": student_id})
        if not g:
            continue
        coef = float(e.get("coefficient", 1) or 1)
        note20 = float(g["value"]) / float(e.get("note_max", 20) or 20) * 20.0
        total_v += note20 * coef
        total_w += coef
    if total_w == 0:
        return None
    return round(total_v / total_w, 2)


@api_router.get("/cahier/{subject_id}")
async def cahier_cotations(subject_id: str, trimestre: int = 1, user: dict = Depends(get_current_user)):
    subject = await db.subjects.find_one({"_id": oid(subject_id)})
    if not subject:
        raise HTTPException(status_code=404, detail="Matière introuvable")
    evals = await db.evaluations.find({"subject_id": subject_id, "trimestre": trimestre}).sort("date", 1).to_list(1000)
    students = await db.students.find({"class_id": subject["class_id"]}).sort("nom", 1).to_list(2000)
    grade_map = {}
    for e in evals:
        for g in await db.grades.find({"evaluation_id": str(e["_id"])}).to_list(2000):
            grade_map[(str(e["_id"]), g["student_id"])] = g["value"]
    rows = []
    for s in students:
        sid = str(s["_id"])
        cells = []
        for e in evals:
            cells.append({"evaluation_id": str(e["_id"]), "value": grade_map.get((str(e["_id"]), sid))})
        moyenne = await compute_subject_average(subject_id, sid, trimestre)
        rows.append({
            "student_id": sid,
            "matricule": s.get("matricule", ""),
            "nom": f"{s['nom']} {s.get('postnom','')} {s.get('prenom','')}".strip(),
            "cells": cells,
            "moyenne": moyenne,
        })
    cls = await db.classes.find_one({"_id": oid(subject["class_id"])})
    return {
        "subject": clean(subject),
        "class_name": f"{cls['name']} {cls['section']}" if cls else "",
        "trimestre": trimestre,
        "evaluations": [clean(e) for e in evals],
        "rows": rows,
    }


def mention_from_pct(pct: float) -> str:
    if pct >= 90:
        return "Excellent"
    if pct >= 80:
        return "Très Bien"
    if pct >= 70:
        return "Bien"
    if pct >= 60:
        return "Assez Bien"
    if pct >= 50:
        return "Satisfaisant"
    return "Ajourné"


@api_router.get("/bulletin/{student_id}")
async def bulletin(student_id: str, trimestre: int = 1, user: dict = Depends(get_current_user)):
    student = await db.students.find_one({"_id": oid(student_id)})
    if not student:
        raise HTTPException(status_code=404, detail="Élève introuvable")
    cls = await db.classes.find_one({"_id": oid(student["class_id"])}) if student.get("class_id") else None
    subjects = await db.subjects.find({"class_id": student["class_id"]}).to_list(1000)
    lines = []
    total_pts = 0.0
    total_coef = 0.0
    for subj in subjects:
        moy = await compute_subject_average(str(subj["_id"]), student_id, trimestre)
        coef = float(subj.get("coefficient", 1) or 1)
        lines.append({
            "matiere": subj["name"],
            "coefficient": coef,
            "moyenne": moy,
            "total": round(moy * coef, 2) if moy is not None else None,
        })
        if moy is not None:
            total_pts += moy * coef
            total_coef += coef
    moyenne_gen = round(total_pts / total_coef, 2) if total_coef else None
    pct = round(moyenne_gen / 20 * 100, 1) if moyenne_gen is not None else None

    # rang within class
    rang = None
    total_eleves = await db.students.count_documents({"class_id": student["class_id"]})
    if moyenne_gen is not None:
        classmates = await db.students.find({"class_id": student["class_id"]}).to_list(2000)
        scores = []
        for cm in classmates:
            cpts = 0.0
            ccoef = 0.0
            for subj in subjects:
                m = await compute_subject_average(str(subj["_id"]), str(cm["_id"]), trimestre)
                if m is not None:
                    cpts += m * float(subj.get("coefficient", 1) or 1)
                    ccoef += float(subj.get("coefficient", 1) or 1)
            scores.append((cpts / ccoef) if ccoef else -1)
        scores_sorted = sorted([s for s in scores if s >= 0], reverse=True)
        try:
            rang = scores_sorted.index(moyenne_gen) + 1
        except ValueError:
            better = sum(1 for s in scores_sorted if s > moyenne_gen)
            rang = better + 1

    return {
        "student": clean(student),
        "class_name": f"{cls['name']} {cls['section']}" if cls else "",
        "trimestre": trimestre,
        "lines": lines,
        "moyenne_generale": moyenne_gen,
        "pourcentage": pct,
        "mention": mention_from_pct(pct) if pct is not None else "—",
        "rang": rang,
        "total_eleves": total_eleves,
    }


# ---------------------------------------------------------------------------
# Reclamations
# ---------------------------------------------------------------------------
@api_router.get("/reclamations")
async def list_reclamations(user: dict = Depends(get_current_user)):
    docs = await db.reclamations.find().sort("date", -1).to_list(1000)
    result = []
    for r in docs:
        s = await db.students.find_one({"_id": oid(r["student_id"])}) if r.get("student_id") else None
        r = clean(r)
        r["student_name"] = f"{s['nom']} {s.get('postnom','')}".strip() if s else "—"
        result.append(r)
    return result


@api_router.post("/reclamations")
async def create_reclamation(body: ReclamationCreate, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc["status"] = "ouverte"
    doc["date"] = now_iso()
    doc["created_by"] = user["name"]
    res = await db.reclamations.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.post("/reclamations/{rid}/resolve")
async def resolve_reclamation(rid: str, user: dict = Depends(require_roles("admin"))):
    await db.reclamations.update_one({"_id": oid(rid)}, {"$set": {"status": "resolue"}})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Teacher payments / honoraires (admin inventory)
# ---------------------------------------------------------------------------
@api_router.post("/teacher-payments")
async def pay_teacher(body: TeacherPaymentBody, user: dict = Depends(require_roles("admin"))):
    doc = body.model_dump()
    doc["date"] = now_iso()
    doc["recorded_by"] = user["name"]
    res = await db.teacher_payments.insert_one(doc)
    doc["_id"] = res.inserted_id
    return clean(doc)


@api_router.get("/inventory")
async def inventory(user: dict = Depends(require_roles("admin"))):
    teachers = await db.users.find({"role": "enseignant"}).to_list(1000)
    rows = []
    total_due = 0.0
    total_paid = 0.0
    for t in teachers:
        salaire = float(t.get("salaire_trimestre", 0) or 0)
        due_annuel = salaire * 3
        paid = 0.0
        for tp in await db.teacher_payments.find({"teacher_id": str(t["_id"])}).to_list(1000):
            paid += float(tp.get("amount", 0))
        rows.append({
            "teacher_id": str(t["_id"]),
            "name": t["name"],
            "salaire_trimestre": salaire,
            "du_annuel": round(due_annuel, 2),
            "paye": round(paid, 2),
            "reste": round(due_annuel - paid, 2),
        })
        total_due += due_annuel
        total_paid += paid
    return {
        "rows": rows,
        "masse_salariale_annuelle": round(total_due, 2),
        "total_paye": round(total_paid, 2),
        "reste_a_payer": round(total_due - total_paid, 2),
    }


# ---------------------------------------------------------------------------
# Settings
# ---------------------------------------------------------------------------
DEFAULT_SETTINGS = {
    "nom_ecole": "Complexe Scolaire St. Joseph du Grand Lac",
    "sigle": "C.S.J.G.L",
    "ville": "Kamanyola",
    "annee_scolaire": "2025-2026",
    "options": ["Pédagogie générale", "Technique sociale", "Commerciale de Gestion", "Électricité", "Agronomie"],
}


class SettingsBody(BaseModel):
    nom_ecole: str
    sigle: str
    ville: str
    annee_scolaire: str
    options: List[str]


async def get_settings_doc() -> dict:
    doc = await db.settings.find_one({"_id": "main"})
    return {**DEFAULT_SETTINGS, **(doc or {})}


@api_router.get("/settings")
async def get_settings(user: dict = Depends(get_current_user)):
    s = await get_settings_doc()
    s.pop("_id", None)
    return s


@api_router.put("/settings")
async def update_settings(body: SettingsBody, user: dict = Depends(require_roles("admin"))):
    data = body.model_dump()
    data["options"] = [o.strip() for o in data["options"] if o.strip()]
    await db.settings.update_one({"_id": "main"}, {"$set": data}, upsert=True)
    return data


# ---------------------------------------------------------------------------
# Dashboard aggregates
# ---------------------------------------------------------------------------
@api_router.get("/dashboard/admin")
async def dashboard_admin(user: dict = Depends(require_roles("admin"))):
    total_eleves = await db.students.count_documents({})
    inscrits = await db.students.count_documents({"status": {"$in": ["inscrit", "actif"]}})
    actifs = await db.students.count_documents({"status": "actif"})
    pre_inscrits = await db.students.count_documents({"status": "pre_inscrit"})
    total_classes = await db.classes.count_documents({})

    recettes = 0.0
    for p in await db.payments.find().to_list(5000):
        recettes += float(p.get("total_amount", 0))
    depenses = 0.0
    for e in await db.expenses.find().to_list(5000):
        depenses += float(e.get("amount", 0))

    dettes_eleves = 0.0
    for s in await db.students.find().to_list(5000):
        led = await student_ledger(s)
        dettes_eleves += max(led["dette"], 0)

    inv = await inventory(user)
    reclam_ouvertes = await db.reclamations.count_documents({"status": "ouverte"})
    derniers = await list_payments(user)

    return {
        "derniers_paiements": derniers[:10],
        "total_eleves": total_eleves,
        "inscrits": inscrits,
        "actifs": actifs,
        "pre_inscrits": pre_inscrits,
        "total_classes": total_classes,
        "recettes": round(recettes, 2),
        "depenses": round(depenses, 2),
        "solde_net": round(recettes - depenses, 2),
        "dettes_eleves": round(dettes_eleves, 2),
        "dettes_enseignants": inv["reste_a_payer"],
        "reclamations_ouvertes": reclam_ouvertes,
    }


@api_router.get("/dashboard/comptable")
async def dashboard_comptable(user: dict = Depends(require_roles("admin", "comptable"))):
    recettes = 0.0
    for p in await db.payments.find().to_list(5000):
        recettes += float(p.get("total_amount", 0))
    depenses = 0.0
    for e in await db.expenses.find().to_list(5000):
        depenses += float(e.get("amount", 0))
    dettes = 0.0
    for s in await db.students.find().to_list(5000):
        led = await student_ledger(s)
        dettes += max(led["dette"], 0)
    return {
        "total_eleves": await db.students.count_documents({}),
        "pre_inscrits": await db.students.count_documents({"status": "pre_inscrit"}),
        "recettes": round(recettes, 2),
        "depenses": round(depenses, 2),
        "solde_net": round(recettes - depenses, 2),
        "dettes_eleves": round(dettes, 2),
        "nb_paiements": await db.payments.count_documents({}),
    }


@api_router.get("/results")
async def results(class_id: str, trimestre: int = 1, user: dict = Depends(require_roles("admin", "enseignant"))):
    students = await db.students.find({"class_id": class_id}).sort("nom", 1).to_list(2000)
    subjects = await db.subjects.find({"class_id": class_id}).to_list(1000)
    rows = []
    for s in students:
        pts = 0.0
        coef = 0.0
        for subj in subjects:
            m = await compute_subject_average(str(subj["_id"]), str(s["_id"]), trimestre)
            if m is not None:
                pts += m * float(subj.get("coefficient", 1) or 1)
                coef += float(subj.get("coefficient", 1) or 1)
        moy = round(pts / coef, 2) if coef else None
        rows.append({
            "student_id": str(s["_id"]),
            "nom": f"{s['nom']} {s.get('postnom','')} {s.get('prenom','')}".strip(),
            "moyenne": moy,
            "pourcentage": round(moy / 20 * 100, 1) if moy is not None else None,
            "mention": mention_from_pct(moy / 20 * 100) if moy is not None else "—",
        })
    rows.sort(key=lambda r: (r["moyenne"] if r["moyenne"] is not None else -1), reverse=True)
    for i, r in enumerate(rows):
        r["rang"] = i + 1 if r["moyenne"] is not None else None
    graded = [r["moyenne"] for r in rows if r["moyenne"] is not None]
    return {
        "rows": rows,
        "moyenne_classe": round(sum(graded) / len(graded), 2) if graded else None,
        "taux_reussite": round(sum(1 for m in graded if m >= 10) / len(graded) * 100, 1) if graded else None,
    }


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------
async def ensure_user(email, password, name, role, access_code=None, salaire=0.0):
    email = email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        upd = {}
        if not verify_password(password, existing["password_hash"]):
            upd["password_hash"] = hash_password(password)
        if access_code and existing.get("access_code") != access_code:
            upd["access_code"] = access_code
        if upd:
            await db.users.update_one({"email": email}, {"$set": upd})
        return str(existing["_id"])
    doc = {
        "name": name, "email": email, "password_hash": hash_password(password),
        "role": role, "access_code": access_code, "salaire_trimestre": salaire,
        "created_at": now_iso(),
    }
    res = await db.users.insert_one(doc)
    return str(res.inserted_id)


async def seed():
    admin_id = await ensure_user(os.environ["ADMIN_EMAIL"], os.environ["ADMIN_PASSWORD"], "Directeur Général", "admin",
                                 access_code=os.environ["ADMIN_ACCESS_CODE"])
    await ensure_user(os.environ["COMPTABLE_EMAIL"], os.environ["COMPTABLE_PASSWORD"], "Comptable Principal", "comptable")
    prof_id = await ensure_user(os.environ["ENSEIGNANT_EMAIL"], os.environ["ENSEIGNANT_PASSWORD"], "Prof. Kabongo Jean",
                                "enseignant", access_code=os.environ["ENSEIGNANT_ACCESS_CODE"], salaire=450.0)
    await seed_classes()
    return  # aucune autre donnée de démonstration


async def seed_classes():
    if await db.classes.count_documents({}) > 0:
        return
    fee = {"frais_inscription": 0, "frais_t1": 0, "frais_t2": 0, "frais_t3": 0}
    defs = []
    for i in range(1, 4):
        defs.append({"name": f"{i}{'er' if i == 1 else 'e'} Niveau", "section": "Maternel", "niveau": "Maternel"})
    for i in range(1, 7):
        defs.append({"name": f"{i}{'ère' if i == 1 else 'e'} Année", "section": "Primaire", "niveau": "Primaire"})
    for i in (7, 8):
        defs.append({"name": f"{i}e Année", "section": "Éducation de base", "niveau": "Éducation de base"})
    for opt in ["Pédagogie générale", "Technique sociale", "Commerciale de Gestion", "Électricité", "Agronomie"]:
        for i in range(1, 5):
            defs.append({"name": f"{i}{'ère' if i == 1 else 'e'} Humanités", "section": opt, "niveau": "Humanités"})
    for c in defs:
        await db.classes.insert_one({**c, **fee, "created_at": now_iso()})


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await seed()
    # write test credentials
    creds = f"""# Test Credentials — ScolarEtat

## Admin
- Email: {os.environ['ADMIN_EMAIL']}
- Password: {os.environ['ADMIN_PASSWORD']}
- Role: admin

## Comptable
- Email: {os.environ['COMPTABLE_EMAIL']}
- Password: {os.environ['COMPTABLE_PASSWORD']}
- Role: comptable

## Enseignant
- Email: {os.environ['ENSEIGNANT_EMAIL']}
- Password: {os.environ['ENSEIGNANT_PASSWORD']}
- Access code (PIN): {os.environ['ENSEIGNANT_ACCESS_CODE']}
- Role: enseignant

## Auth endpoints
- POST /api/auth/login  (body: email, password) -> returns access_token + user
- GET  /api/auth/me      (Bearer token)
"""
    try:
        Path("/app/memory/test_credentials.md").write_text(creds)
    except Exception as e:
        logger.warning(f"cred write failed: {e}")


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
