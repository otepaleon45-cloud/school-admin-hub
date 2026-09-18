"""ScolarEtat backend API regression tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://school-admin-hub-161.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"

ADMIN = ("otepaleon45@gmail.com", "admin123")
COMPTABLE = ("comptable@scolaretat.cd", "compta123")
ENSEIGNANT = ("enseignant@scolaretat.cd", "prof123")


def _login(email, password):
    r = requests.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=30)
    assert r.status_code == 200, f"login {email}: {r.status_code} {r.text}"
    j = r.json()
    assert "access_token" in j and "user" in j
    return j["access_token"], j["user"]


@pytest.fixture(scope="session")
def admin_tok():
    return _login(*ADMIN)[0]


@pytest.fixture(scope="session")
def comptable_tok():
    return _login(*COMPTABLE)[0]


@pytest.fixture(scope="session")
def enseignant_data():
    tok, user = _login(*ENSEIGNANT)
    return tok, user


def H(tok):
    return {"Authorization": f"Bearer {tok}"}


# --- Auth
def test_login_bad():
    r = requests.post(f"{API}/auth/login", json={"email": "x@x.com", "password": "bad"})
    assert r.status_code == 401


def test_me(admin_tok):
    r = requests.get(f"{API}/auth/me", headers=H(admin_tok))
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


# --- Admin dashboard/inventory/results/reclamations
def test_admin_dashboard(admin_tok):
    r = requests.get(f"{API}/dashboard/admin", headers=H(admin_tok))
    assert r.status_code == 200
    d = r.json()
    for k in ["total_eleves", "recettes", "depenses", "dettes_eleves", "dettes_enseignants", "reclamations_ouvertes"]:
        assert k in d
    assert d["total_eleves"] >= 10


def test_inventory(admin_tok):
    r = requests.get(f"{API}/inventory", headers=H(admin_tok))
    assert r.status_code == 200
    d = r.json()
    assert len(d["rows"]) >= 2
    assert d["masse_salariale_annuelle"] > 0


def test_teacher_payment_flow(admin_tok):
    inv = requests.get(f"{API}/inventory", headers=H(admin_tok)).json()
    tid = inv["rows"][0]["teacher_id"]
    before_reste = inv["rows"][0]["reste"]
    r = requests.post(f"{API}/teacher-payments", headers=H(admin_tok),
                      json={"teacher_id": tid, "amount": 10, "trimestre": 1, "note": "TEST_pay"})
    assert r.status_code == 200
    inv2 = requests.get(f"{API}/inventory", headers=H(admin_tok)).json()
    row = next(r for r in inv2["rows"] if r["teacher_id"] == tid)
    assert round(row["reste"], 2) == round(before_reste - 10, 2)


def test_results(admin_tok):
    classes = requests.get(f"{API}/classes", headers=H(admin_tok)).json()
    cid = classes[0]["id"]
    r = requests.get(f"{API}/results?class_id={cid}&trimestre=1", headers=H(admin_tok))
    assert r.status_code == 200
    d = r.json()
    assert "rows" in d and len(d["rows"]) > 0
    # ranking should be present for graded
    graded = [row for row in d["rows"] if row["moyenne"] is not None]
    if graded:
        assert graded[0]["rang"] == 1


def test_reclamations_resolve(admin_tok):
    r = requests.get(f"{API}/reclamations", headers=H(admin_tok))
    assert r.status_code == 200
    items = r.json()
    assert len(items) >= 1
    rid = items[0]["id"]
    rs = requests.post(f"{API}/reclamations/{rid}/resolve", headers=H(admin_tok))
    assert rs.status_code == 200
    items2 = requests.get(f"{API}/reclamations", headers=H(admin_tok)).json()
    updated = next(i for i in items2 if i["id"] == rid)
    assert updated["status"] == "resolue"


def test_user_crud(admin_tok):
    email = "test_user_scolaretat@example.com"
    # cleanup if exists
    users = requests.get(f"{API}/users", headers=H(admin_tok)).json()
    for u in users:
        if u["email"] == email:
            requests.delete(f"{API}/users/{u['id']}", headers=H(admin_tok))
    r = requests.post(f"{API}/users", headers=H(admin_tok),
                      json={"name": "TEST User", "email": email, "password": "pass1234", "role": "comptable"})
    assert r.status_code == 200
    uid = r.json()["id"]
    users2 = requests.get(f"{API}/users", headers=H(admin_tok)).json()
    assert any(u["id"] == uid for u in users2)
    requests.delete(f"{API}/users/{uid}", headers=H(admin_tok))


# --- Comptable
def test_comptable_dashboard(comptable_tok):
    r = requests.get(f"{API}/dashboard/comptable", headers=H(comptable_tok))
    assert r.status_code == 200
    d = r.json()
    assert d["total_eleves"] >= 10
    assert d["nb_paiements"] >= 1


def test_student_create_and_payment(comptable_tok):
    classes = requests.get(f"{API}/classes", headers=H(comptable_tok)).json()
    cid = classes[0]["id"]
    r = requests.post(f"{API}/students", headers=H(comptable_tok),
                      json={"nom": "TEST_Nom", "postnom": "Post", "prenom": "Pre", "class_id": cid, "genre": "M"})
    assert r.status_code == 200
    sid = r.json()["id"]
    assert r.json()["status"] == "pre_inscrit"
    # payment split
    p = requests.post(f"{API}/payments", headers=H(comptable_tok), json={
        "student_id": sid,
        "allocations": [{"category": "inscription", "amount": 20}, {"category": "t1", "amount": 30}],
        "note": "TEST_payment"
    })
    assert p.status_code == 200
    body = p.json()
    assert body["payment"]["total_amount"] == 50
    assert body["ledger"]["total_paid"] >= 50
    # check status upgraded
    s = requests.get(f"{API}/students/{sid}", headers=H(comptable_tok)).json()
    assert s["status"] == "inscrit"
    # receipt
    rec = requests.get(f"{API}/receipts/{body['payment']['id']}", headers=H(comptable_tok))
    assert rec.status_code == 200
    assert len(rec.json()["allocations"]) == 2


def test_payment_no_allocations(comptable_tok):
    classes = requests.get(f"{API}/classes", headers=H(comptable_tok)).json()
    students = requests.get(f"{API}/students?class_id={classes[0]['id']}", headers=H(comptable_tok)).json()
    r = requests.post(f"{API}/payments", headers=H(comptable_tok),
                      json={"student_id": students[0]["id"], "allocations": [{"category": "inscription", "amount": 0}]})
    assert r.status_code == 400


def test_expense_create_list(comptable_tok):
    r = requests.post(f"{API}/expenses", headers=H(comptable_tok),
                      json={"category": "TEST_cat", "amount": 12.5, "description": "TEST_exp"})
    assert r.status_code == 200
    eid = r.json()["id"]
    lst = requests.get(f"{API}/expenses", headers=H(comptable_tok)).json()
    assert any(e["id"] == eid for e in lst)
    requests.delete(f"{API}/expenses/{eid}", headers=H(comptable_tok))


# --- Enseignant
def test_my_classes(enseignant_data):
    tok, _ = enseignant_data
    r = requests.get(f"{API}/my-classes", headers=H(tok))
    assert r.status_code == 200
    d = r.json()
    assert len(d) >= 1
    assert "matieres" in d[0] and len(d[0]["matieres"]) >= 1


def test_cahier_and_grade_flow(enseignant_data):
    tok, user = enseignant_data
    subjects = requests.get(f"{API}/subjects?mine=true", headers=H(tok)).json()
    assert len(subjects) >= 1
    sub = subjects[0]
    c = requests.get(f"{API}/cahier/{sub['id']}?trimestre=1", headers=H(tok))
    assert c.status_code == 200
    d = c.json()
    assert len(d["rows"]) > 0
    assert len(d["evaluations"]) >= 1
    # create new eval + grade
    ev = requests.post(f"{API}/evaluations", headers=H(tok),
                       json={"subject_id": sub["id"], "type": "Interrogation", "title": "TEST_eval",
                             "note_max": 10, "coefficient": 1, "trimestre": 1})
    assert ev.status_code == 200
    eid = ev.json()["id"]
    sid = d["rows"][0]["student_id"]
    g = requests.post(f"{API}/grades", headers=H(tok),
                      json={"evaluation_id": eid, "grades": [{"student_id": sid, "value": 8}]})
    assert g.status_code == 200
    # verify moyenne recomputed
    c2 = requests.get(f"{API}/cahier/{sub['id']}?trimestre=1", headers=H(tok)).json()
    row = next(r for r in c2["rows"] if r["student_id"] == sid)
    assert row["moyenne"] is not None
    # cleanup
    requests.delete(f"{API}/evaluations/{eid}", headers=H(tok))


def test_bulletin(enseignant_data):
    tok, _ = enseignant_data
    mc = requests.get(f"{API}/my-classes", headers=H(tok)).json()
    cid = mc[0]["id"]
    students = requests.get(f"{API}/students?class_id={cid}", headers=H(tok)).json()
    sid = students[0]["id"]
    r = requests.get(f"{API}/bulletin/{sid}?trimestre=1", headers=H(tok))
    assert r.status_code == 200
    b = r.json()
    assert "lines" in b and len(b["lines"]) >= 1
    assert b["moyenne_generale"] is not None
    assert b["mention"] != "—"
    assert b["rang"] is not None


# --- Role guarding
def test_role_forbidden(comptable_tok):
    r = requests.get(f"{API}/inventory", headers=H(comptable_tok))
    assert r.status_code == 403
    r2 = requests.get(f"{API}/users", headers=H(comptable_tok))
    assert r2.status_code == 403
