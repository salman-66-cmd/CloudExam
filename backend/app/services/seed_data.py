from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from backend.app.models.models import (
    User, UserRole, Subject, Course, Enrollment, 
    Question, QuestionOption, QuestionType, DifficultyLevel,
    Examination, ExamQuestion, ExamAttempt, AttemptAnswer, 
    AttemptStatus, Notification, NotificationType, AuditLog, SystemSetting
)
from backend.app.core.security import get_password_hash

def seed_database(db: Session):
    # Check if admin already exists
    existing_admin = db.query(User).filter(User.email == "admin@cloudexam.edu").first()
    if existing_admin:
        return

    now = datetime.now(timezone.utc)

    # 1. Users
    admin_user = User(
        email="admin@cloudexam.edu",
        username="admin",
        full_name="Platform Administrator",
        hashed_password=get_password_hash("Admin123!"),
        role=UserRole.ADMIN,
        is_active=True
    )
    teacher_user = User(
        email="teacher@cloudexam.edu",
        username="prof_johnson",
        full_name="Prof. Sarah Johnson",
        hashed_password=get_password_hash("Teacher123!"),
        role=UserRole.TEACHER,
        is_active=True
    )
    student1 = User(
        email="student@cloudexam.edu",
        username="alex_student",
        full_name="Alex Rivera",
        hashed_password=get_password_hash("Student123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    student2 = User(
        email="alice@cloudexam.edu",
        username="alice_w",
        full_name="Alice Wong",
        hashed_password=get_password_hash("Alice123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    student3 = User(
        email="bob@cloudexam.edu",
        username="bob_m",
        full_name="Bob Martinez",
        hashed_password=get_password_hash("Bob123!"),
        role=UserRole.STUDENT,
        is_active=True
    )
    db.add_all([admin_user, teacher_user, student1, student2, student3])
    db.commit()

    # 2. Subjects
    sub_cloud = Subject(
        name="Cloud Computing & Infrastructure",
        code="CS-CC401",
        description="Core concepts of cloud deployment models, virtualization, scalable storage, and container orchestration."
    )
    sub_dist = Subject(
        name="Distributed Systems",
        code="CS-DS502",
        description="Consensus algorithms, CAP theorem, replication, fault tolerance, and message brokers."
    )
    db.add_all([sub_cloud, sub_dist])
    db.commit()

    # 3. Courses
    course_cloud = Course(
        code="CC-2026",
        name="Cloud Computing & DevOps Engineering",
        description="Comprehensive course covering AWS/GCP architecture, Docker, Kubernetes, microservices, and CI/CD pipelines.",
        academic_term="Spring 2026",
        teacher_id=teacher_user.id,
        status="ACTIVE"
    )
    db.add(course_cloud)
    db.commit()

    # 4. Enrollments
    e1 = Enrollment(course_id=course_cloud.id, student_id=student1.id)
    e2 = Enrollment(course_id=course_cloud.id, student_id=student2.id)
    e3 = Enrollment(course_id=course_cloud.id, student_id=student3.id)
    db.add_all([e1, e2, e3])
    db.commit()

    # 5. Question Bank (Covering all 5 Question Types)
    q1 = Question(
        teacher_id=teacher_user.id,
        subject_id=sub_cloud.id,
        course_id=course_cloud.id,
        topic="Cloud Storage",
        difficulty=DifficultyLevel.EASY,
        question_type=QuestionType.MCQ_SINGLE,
        question_text="Which cloud storage model provides virtually unlimited capacity and is accessed via HTTP REST APIs?",
        marks=2.0,
        explanation="Object storage (such as AWS S3 or Google Cloud Storage) stores data as objects within buckets and is accessed via HTTP/HTTPS APIs.",
        model_answer=None
    )
    db.add(q1)
    db.commit()
    db.add_all([
        QuestionOption(question_id=q1.id, option_text="Block Storage (SAN/EBS)", is_correct=False, order_index=1),
        QuestionOption(question_id=q1.id, option_text="Object Storage (e.g., S3/GCS)", is_correct=True, order_index=2),
        QuestionOption(question_id=q1.id, option_text="File Storage (NFS/EFS)", is_correct=False, order_index=3),
        QuestionOption(question_id=q1.id, option_text="Tape Archival Storage", is_correct=False, order_index=4),
    ])

    q2 = Question(
        teacher_id=teacher_user.id,
        subject_id=sub_cloud.id,
        course_id=course_cloud.id,
        topic="NIST Cloud Characteristics",
        difficulty=DifficultyLevel.MEDIUM,
        question_type=QuestionType.MCQ_MULTIPLE,
        question_text="According to the NIST definition, which of the following are essential characteristics of Cloud Computing? (Select all that apply)",
        marks=3.0,
        explanation="NIST SP 800-145 identifies 5 essential characteristics: On-demand self-service, Broad network access, Resource pooling, Rapid elasticity, and Measured service.",
        model_answer=None
    )
    db.add(q2)
    db.commit()
    db.add_all([
        QuestionOption(question_id=q2.id, option_text="On-demand self-service", is_correct=True, order_index=1),
        QuestionOption(question_id=q2.id, option_text="Rapid elasticity", is_correct=True, order_index=2),
        QuestionOption(question_id=q2.id, option_text="Mandatory hardware ownership", is_correct=False, order_index=3),
        QuestionOption(question_id=q2.id, option_text="Resource pooling", is_correct=True, order_index=4),
    ])

    q3 = Question(
        teacher_id=teacher_user.id,
        subject_id=sub_cloud.id,
        course_id=course_cloud.id,
        topic="Scalability",
        difficulty=DifficultyLevel.EASY,
        question_type=QuestionType.TRUE_FALSE,
        question_text="Horizontal autoscaling (scaling out) refers to adding more CPU cores or RAM to a single virtual machine instance.",
        marks=1.0,
        explanation="False. Adding CPU/RAM to an existing instance is Vertical Scaling (scaling up). Horizontal Scaling refers to adding more replica instances behind a load balancer.",
        model_answer=None
    )
    db.add(q3)
    db.commit()
    db.add_all([
        QuestionOption(question_id=q3.id, option_text="True", is_correct=False, order_index=1),
        QuestionOption(question_id=q3.id, option_text="False", is_correct=True, order_index=2),
    ])

    q4 = Question(
        teacher_id=teacher_user.id,
        subject_id=sub_cloud.id,
        course_id=course_cloud.id,
        topic="API Design",
        difficulty=DifficultyLevel.MEDIUM,
        question_type=QuestionType.SHORT_ANSWER,
        question_text="Explain the concept of idempotency in RESTful cloud API design and name one HTTP method that is idempotent.",
        marks=2.0,
        explanation="An idempotent operation produces the same server-side result whether called once or multiple times consecutively. GET, PUT, and DELETE are idempotent.",
        model_answer="An operation is idempotent if making multiple identical requests has the same effect as making a single request. Methods like GET, PUT, and DELETE are idempotent."
    )
    db.add(q4)

    q5 = Question(
        teacher_id=teacher_user.id,
        subject_id=sub_cloud.id,
        course_id=course_cloud.id,
        topic="Microservices Architecture",
        difficulty=DifficultyLevel.HARD,
        question_type=QuestionType.ESSAY,
        question_text="Analyze the architectural trade-offs between monolithic applications and cloud-native microservices in terms of deployment velocity, fault isolation, and data consistency.",
        marks=5.0,
        explanation="Key points: Microservices allow independent CI/CD releases and fine-grained fault isolation, but introduce distributed data consistency challenges (eventual consistency, Saga pattern) and network latency compared to ACID in monoliths.",
        model_answer="Detailed grading criteria: 1) Deployment velocity: independent pipelines vs single artifact; 2) Fault isolation: blast radius containment via circuit breakers vs shared memory crash; 3) Data consistency: Saga pattern/2PC vs ACID."
    )
    db.add(q5)
    db.commit()

    # 6. Examination: Cloud Computing Mid-Term Exam (Total marks: 13.0)
    exam1 = Examination(
        title="Cloud Computing Mid-Term Examination 2026",
        description="Official mid-term assessment evaluating storage systems, scalability principles, REST idempotency, and cloud-native microservices architecture.",
        course_id=course_cloud.id,
        teacher_id=teacher_user.id,
        start_time=now - timedelta(days=1),
        end_time=now + timedelta(days=7),
        duration_minutes=45,
        total_marks=13.0,
        passing_marks=6.5,
        randomize_questions=False,
        randomize_options=False,
        max_attempts=2,
        negative_marking=True,
        negative_mark_value=0.5,
        partial_credit=True,
        is_published=True,
        results_published=True,
        instructions="Ensure stable internet connectivity. Objective questions will be auto-graded immediately upon submission. Subjective responses will be evaluated by Prof. Johnson."
    )
    db.add(exam1)
    db.commit()

    # Associate questions to exam
    for idx, q in enumerate([q1, q2, q3, q4, q5], start=1):
        db.add(ExamQuestion(exam_id=exam1.id, question_id=q.id, order_index=idx, marks_override=q.marks))
    db.commit()

    # 7. Pre-populated completed attempts for Student 2 (Alice) and Student 3 (Bob) for instant rich analytics
    # Alice's Attempt (High performer)
    att_alice = ExamAttempt(
        exam_id=exam1.id,
        student_id=student2.id,
        attempt_number=1,
        status=AttemptStatus.EVALUATED,
        started_at=now - timedelta(hours=5),
        deadline=now - timedelta(hours=4, minutes=15),
        submitted_at=now - timedelta(hours=4, minutes=25),
        score_obtained=11.5,
        percentage=88.46,
        passed=True,
        teacher_feedback="Outstanding analytical depth in the microservices architectural comparison."
    )
    db.add(att_alice)
    db.commit()

    # Alice's Answers
    db.add_all([
        AttemptAnswer(attempt_id=att_alice.id, question_id=q1.id, selected_option_ids=[q1.options[1].id], is_evaluated=True, marks_awarded=2.0),
        AttemptAnswer(attempt_id=att_alice.id, question_id=q2.id, selected_option_ids=[q2.options[0].id, q2.options[1].id, q2.options[3].id], is_evaluated=True, marks_awarded=3.0),
        AttemptAnswer(attempt_id=att_alice.id, question_id=q3.id, selected_option_ids=[q3.options[1].id], is_evaluated=True, marks_awarded=1.0),
        AttemptAnswer(attempt_id=att_alice.id, question_id=q4.id, text_response="Idempotency means multiple identical requests have the exact same server effect as one. PUT and GET are idempotent.", is_evaluated=True, marks_awarded=2.0),
        AttemptAnswer(attempt_id=att_alice.id, question_id=q5.id, text_response="Microservices decompose large monolithic systems into loosely coupled services, enabling high deployment velocity and localized fault tolerance, though requiring distributed tracing and eventual consistency mechanisms.", is_evaluated=True, marks_awarded=3.5, evaluated_by_id=teacher_user.id, feedback="Strong points covered.")
    ])

    # Bob's Attempt (Medium performer)
    att_bob = ExamAttempt(
        exam_id=exam1.id,
        student_id=student3.id,
        attempt_number=1,
        status=AttemptStatus.EVALUATED,
        started_at=now - timedelta(hours=3),
        deadline=now - timedelta(hours=2, minutes=15),
        submitted_at=now - timedelta(hours=2, minutes=30),
        score_obtained=7.5,
        percentage=57.69,
        passed=True,
        teacher_feedback="Good grasp of basic cloud definitions. Review distributed data consistency."
    )
    db.add(att_bob)
    db.commit()

    db.add_all([
        AttemptAnswer(attempt_id=att_bob.id, question_id=q1.id, selected_option_ids=[q1.options[1].id], is_evaluated=True, marks_awarded=2.0),
        AttemptAnswer(attempt_id=att_bob.id, question_id=q2.id, selected_option_ids=[q2.options[0].id, q2.options[1].id], is_evaluated=True, marks_awarded=2.0),
        AttemptAnswer(attempt_id=att_bob.id, question_id=q3.id, selected_option_ids=[q3.options[1].id], is_evaluated=True, marks_awarded=1.0),
        AttemptAnswer(attempt_id=att_bob.id, question_id=q4.id, text_response="Idempotent operations can be executed repeatedly safely.", is_evaluated=True, marks_awarded=1.5),
        AttemptAnswer(attempt_id=att_bob.id, question_id=q5.id, text_response="Monoliths are simpler to develop but hard to scale. Microservices need containers and Kubernetes.", is_evaluated=True, marks_awarded=1.0, evaluated_by_id=teacher_user.id, feedback="Brief response.")
    ])

    # 8. Notifications
    db.add_all([
        Notification(user_id=student1.id, title="New Examination Assigned", message="You have been assigned to 'Cloud Computing Mid-Term Examination 2026'. Window is now open.", notification_type=NotificationType.EXAM_ASSIGNED, link_url="/exams"),
        Notification(user_id=student2.id, title="Results Published", message="Results for 'Cloud Computing Mid-Term Examination 2026' have been published. Your score: 88.5%", notification_type=NotificationType.RESULT_PUBLISHED, link_url="/results"),
        Notification(user_id=teacher_user.id, title="Exam Submissions Ready", message="Student submissions are ready for review.", notification_type=NotificationType.INFO, link_url="/evaluations"),
    ])

    # 9. Audit Logs
    db.add_all([
        AuditLog(user_id=admin_user.id, action="INITIALIZE_SYSTEM", resource_type="SYSTEM", resource_id="cluster-01", details={"status": "healthy", "version": "1.0.0"}),
        AuditLog(user_id=teacher_user.id, action="CREATE_EXAM", resource_type="EXAM", resource_id=str(exam1.id), details={"title": exam1.title, "duration": 45}),
        AuditLog(user_id=student2.id, action="SUBMIT_EXAM", resource_type="ATTEMPT", resource_id=str(att_alice.id), details={"score": 11.5, "passed": True}),
    ])

    # 10. System Settings
    db.add_all([
        SystemSetting(key="ALLOW_REGISTRATION", value="true", description="Allow new students to register directly"),
        SystemSetting(key="PLATFORM_NAME", value="CloudExam Academic Portal", description="Display title for institution"),
        SystemSetting(key="MAX_FILE_SIZE_MB", value="10", description="Max attachment upload size in megabytes"),
    ])

    db.commit()
