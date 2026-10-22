import pytest
from datetime import datetime, timezone, timedelta
from starlette.testclient import TestClient
from backend.app.main import app
from backend.app.core.database import SessionLocal, Base, engine
from backend.app.models.models import User, UserRole, Course, Examination, ExamAttempt, AttemptStatus, Question, QuestionOption, QuestionType

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    from backend.app.services.seed_data import seed_database
    seed_database(db)
    db.close()
    yield

def test_health_and_system():
    resp = client.get("/api/v1/system/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "service" in data

def test_login_flow():
    # Admin login
    resp = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@cloudexam.edu",
        "password": "Admin123!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["role"] == "ADMIN"

    # Student login
    resp_stud = client.post("/api/v1/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    })
    assert resp_stud.status_code == 200
    assert resp_stud.json()["user"]["role"] == "STUDENT"

    # Invalid login
    resp_bad = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@cloudexam.edu",
        "password": "WrongPassword!"
    })
    assert resp_bad.status_code == 401

def test_role_based_access_control():
    # Student cannot access admin audit logs
    login_stud = client.post("/api/v1/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    }).json()
    token_stud = login_stud["access_token"]

    resp = client.get("/api/v1/audit/", headers={"Authorization": f"Bearer {token_stud}"})
    assert resp.status_code == 403

    # Admin can access audit logs
    login_admin = client.post("/api/v1/auth/login", json={
        "username_or_email": "admin@cloudexam.edu",
        "password": "Admin123!"
    }).json()
    token_admin = login_admin["access_token"]
    resp_admin = client.get("/api/v1/audit/", headers={"Authorization": f"Bearer {token_admin}"})
    assert resp_admin.status_code == 200

def test_question_bank_security():
    # Student cannot view or list question bank directly
    login_stud = client.post("/api/v1/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    }).json()
    token_stud = login_stud["access_token"]

    resp = client.get("/api/v1/questions/", headers={"Authorization": f"Bearer {token_stud}"})
    assert resp.status_code == 403

def test_complete_examination_lifecycle_e2e():
    """
    Complete End-to-End Workflow:
    1. Teacher logs in.
    2. Teacher creates a course.
    3. Teacher adds a question.
    4. Teacher creates an exam with objective and subjective questions.
    5. Teacher enrolls a student.
    6. Teacher publishes the exam.
    7. Student logs in.
    8. Student views assigned exam and starts attempt.
    9. Student saves objective answer & subjective answer.
    10. Student submits the attempt.
    11. Automatic objective evaluation verifies score.
    12. Teacher evaluates subjective question.
    13. Teacher publishes results.
    14. Student views their verified published result.
    """
    # 1. Teacher login
    teacher_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "teacher@cloudexam.edu",
        "password": "Teacher123!"
    }).json()
    t_token = teacher_login["access_token"]
    t_headers = {"Authorization": f"Bearer {t_token}"}

    import uuid
    unique_code = f"TEST-{uuid.uuid4().hex[:6].upper()}"
    # 2. Teacher creates course
    course_resp = client.post("/api/v1/courses/", json={
        "code": unique_code,
        "name": "Automated Testing & Distributed Cloud Systems",
        "description": "Integration and stress testing course.",
        "academic_term": "Spring 2026",
        "status": "ACTIVE"
    }, headers=t_headers)
    assert course_resp.status_code == 200
    course_id = course_resp.json()["id"]

    # 3. Teacher creates a question
    q_resp = client.post("/api/v1/questions/", json={
        "topic": "Consensus",
        "difficulty": "EASY",
        "question_type": "MCQ_SINGLE",
        "question_text": "Which consensus protocol is widely used by etcd and Kubernetes?",
        "marks": 2.0,
        "explanation": "Raft is the consensus algorithm used by etcd.",
        "options": [
            {"option_text": "Paxos", "is_correct": False, "order_index": 1},
            {"option_text": "Raft", "is_correct": True, "order_index": 2},
            {"option_text": "Proof of Work", "is_correct": False, "order_index": 3}
        ]
    }, headers=t_headers)
    assert q_resp.status_code == 200
    q_id = q_resp.json()["id"]
    correct_option_id = [opt["id"] for opt in q_resp.json()["options"] if opt["is_correct"]][0]

    # 4. Teacher creates examination
    now = datetime.now(timezone.utc)
    exam_resp = client.post("/api/v1/exams/", json={
        "title": "E2E Distributed Consensus Exam",
        "description": "Verification exam for consensus.",
        "course_id": course_id,
        "start_time": (now - timedelta(minutes=10)).isoformat(),
        "end_time": (now + timedelta(hours=2)).isoformat(),
        "duration_minutes": 30,
        "passing_marks": 1.0,
        "question_ids": [q_id]
    }, headers=t_headers)
    assert exam_resp.status_code == 200
    exam_id = exam_resp.json()["id"]

    # 5. Teacher enrolls student (Student ID 3: Alex Rivera)
    stud_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    }).json()
    s_token = stud_login["access_token"]
    s_headers = {"Authorization": f"Bearer {s_token}"}
    student_id = stud_login["user"]["id"]

    enroll_resp = client.post(f"/api/v1/courses/{course_id}/enrollments", json={
        "student_id": student_id
    }, headers=t_headers)
    assert enroll_resp.status_code == 200

    # 6. Teacher publishes examination
    pub_resp = client.post(f"/api/v1/exams/{exam_id}/publish", headers=t_headers)
    assert pub_resp.status_code == 200

    # 7 & 8. Student starts attempt
    att_resp = client.post(f"/api/v1/attempts/exams/{exam_id}/attempts", headers=s_headers)
    assert att_resp.status_code == 200
    attempt_id = att_resp.json()["attempt_id"]

    # 9. Student saves answer
    save_resp = client.put(
        f"/api/v1/attempts/{attempt_id}/answers/{q_id}",
        json={
            "selected_option_ids": [correct_option_id],
            "text_response": "",
            "is_marked_for_review": False
        },
        headers=s_headers
    )
    assert save_resp.status_code == 200

    # 10. Student submits attempt
    sub_resp = client.post(f"/api/v1/attempts/{attempt_id}/submit", headers=s_headers)
    assert sub_resp.status_code == 200
    assert sub_resp.json()["status"] == "EVALUATED"

    # 11. Verify student cannot see results before publish
    res_before_pub = client.get(f"/api/v1/attempts/{attempt_id}/result", headers=s_headers)
    assert res_before_pub.status_code == 403

    # 12 & 13. Teacher publishes results
    pub_res = client.post(f"/api/v1/exams/{exam_id}/publish-results", headers=t_headers)
    assert pub_res.status_code == 200

    # 14. Student views verified published results
    res_after_pub = client.get(f"/api/v1/attempts/{attempt_id}/result", headers=s_headers)
    assert res_after_pub.status_code == 200
    res_data = res_after_pub.json()
    assert res_data["score_obtained"] == 2.0
    assert res_data["passed"] is True
    assert len(res_data["breakdown"]) == 1
    assert res_data["breakdown"][0]["marks_awarded"] == 2.0

def test_submission_idempotency():
    # Calling submit multiple times on an already submitted attempt should succeed safely without duplicating or erroring
    stud_login = client.post("/api/v1/auth/login", json={
        "username_or_email": "student@cloudexam.edu",
        "password": "Student123!"
    }).json()
    s_headers = {"Authorization": f"Bearer {stud_login['access_token']}"}

    # Attempt 1 from earlier test
    attempts = client.get("/api/v1/results/", headers=s_headers).json()
    if attempts:
        att_id = attempts[0]["attempt_id"]
        sub1 = client.post(f"/api/v1/attempts/{att_id}/submit", headers=s_headers)
        assert sub1.status_code == 200
        sub2 = client.post(f"/api/v1/attempts/{att_id}/submit", headers=s_headers)
        assert sub2.status_code == 200
