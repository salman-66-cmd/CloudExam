from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import (
    Examination, ExamQuestion, Question, Course, Enrollment, 
    ExamAttempt, AttemptStatus, User, UserRole, Notification, NotificationType
)
from backend.app.schemas.schemas import (
    ExaminationCreate, ExaminationUpdate, ExaminationResponse, ExaminationStudentView
)
from backend.app.api.deps import get_current_user, get_current_teacher_or_admin
from backend.app.services.audit_service import log_audit_event
from backend.app.services.analytics_service import get_exam_analytics

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

@router.get("/", response_model=List[Any])
def list_examinations(
    course_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    now = get_utc_now()

    if current_user.role == UserRole.STUDENT:
        # Student view: get courses student is enrolled in
        enrolled_courses = db.query(Enrollment.course_id).filter(Enrollment.student_id == current_user.id).subquery()
        exams = db.query(Examination).filter(
            Examination.course_id.in_(enrolled_courses),
            Examination.is_published == True
        ).all()

        results = []
        for ex in exams:
            start_tz = ex.start_time if ex.start_time.tzinfo else ex.start_time.replace(tzinfo=timezone.utc)
            end_tz = ex.end_time if ex.end_time.tzinfo else ex.end_time.replace(tzinfo=timezone.utc)

            # Check attempt
            att = db.query(ExamAttempt).filter(
                ExamAttempt.exam_id == ex.id,
                ExamAttempt.student_id == current_user.id
            ).order_by(ExamAttempt.attempt_number.desc()).first()

            status_label = "Available"
            if now < start_tz:
                status_label = "Scheduled"
            elif now > end_tz:
                status_label = "Closed"

            has_attempted = False
            attempt_status = None
            attempt_id = None
            score = None

            if att:
                has_attempted = True
                attempt_status = att.status.value
                attempt_id = att.id
                if att.status == AttemptStatus.IN_PROGRESS:
                    status_label = "In Progress"
                elif att.status in [AttemptStatus.SUBMITTED, AttemptStatus.EXPIRED]:
                    status_label = "Evaluating"
                elif att.status == AttemptStatus.EVALUATED:
                    status_label = "Results Published" if ex.results_published else "Evaluating"
                    if ex.results_published:
                        score = att.score_obtained

            results.append({
                "id": ex.id,
                "title": ex.title,
                "description": ex.description,
                "course_id": ex.course_id,
                "course_name": ex.course.name if ex.course else "",
                "start_time": ex.start_time,
                "end_time": ex.end_time,
                "duration_minutes": ex.duration_minutes,
                "total_marks": ex.total_marks,
                "passing_marks": ex.passing_marks,
                "instructions": ex.instructions,
                "status_label": status_label,
                "has_attempted": has_attempted,
                "attempt_status": attempt_status,
                "attempt_id": attempt_id,
                "score_obtained": score,
                "results_published": ex.results_published
            })
        return results

    # Teacher & Admin view: full examination responses
    query = db.query(Examination)
    if current_user.role == UserRole.TEACHER:
        query = query.filter((Examination.teacher_id == current_user.id) | (Examination.is_published == True))
    if course_id:
        query = query.filter(Examination.course_id == course_id)

    exams = query.all()
    results = []
    for ex in exams:
        q_count = len(ex.exam_questions)
        start_tz = ex.start_time if ex.start_time.tzinfo else ex.start_time.replace(tzinfo=timezone.utc)
        end_tz = ex.end_time if ex.end_time.tzinfo else ex.end_time.replace(tzinfo=timezone.utc)

        status_lbl = "Published" if ex.is_published else "Draft"
        if ex.is_published:
            if now < start_tz:
                status_lbl = "Scheduled"
            elif now > end_tz:
                status_lbl = "Completed"
            else:
                status_lbl = "Ongoing"

        results.append({
            "id": ex.id,
            "title": ex.title,
            "description": ex.description,
            "course_id": ex.course_id,
            "course_name": ex.course.name if ex.course else "",
            "teacher_id": ex.teacher_id,
            "teacher_name": ex.teacher.full_name if ex.teacher else "",
            "start_time": ex.start_time,
            "end_time": ex.end_time,
            "duration_minutes": ex.duration_minutes,
            "total_marks": ex.total_marks,
            "passing_marks": ex.passing_marks,
            "randomize_questions": ex.randomize_questions,
            "randomize_options": ex.randomize_options,
            "max_attempts": ex.max_attempts,
            "negative_marking": ex.negative_marking,
            "negative_mark_value": ex.negative_mark_value,
            "partial_credit": ex.partial_credit,
            "instructions": ex.instructions,
            "is_published": ex.is_published,
            "results_published": ex.results_published,
            "question_count": q_count,
            "created_at": ex.created_at,
            "status_label": status_lbl
        })
    return results

@router.post("/")
def create_examination(
    exam_in: ExaminationCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == exam_in.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if exam_in.start_time >= exam_in.end_time:
        raise HTTPException(status_code=400, detail="Start time must be before end time")
    if exam_in.duration_minutes <= 0:
        raise HTTPException(status_code=400, detail="Duration must be positive")

    # Calculate total marks from selected questions
    total_marks = 0.0
    questions = []
    if exam_in.question_ids:
        questions = db.query(Question).filter(Question.id.in_(exam_in.question_ids)).all()
        total_marks = sum(q.marks for q in questions)

    exam = Examination(
        title=exam_in.title,
        description=exam_in.description,
        course_id=exam_in.course_id,
        teacher_id=current_user.id,
        start_time=exam_in.start_time,
        end_time=exam_in.end_time,
        duration_minutes=exam_in.duration_minutes,
        total_marks=total_marks,
        passing_marks=exam_in.passing_marks or (total_marks * 0.4),
        randomize_questions=exam_in.randomize_questions,
        randomize_options=exam_in.randomize_options,
        max_attempts=exam_in.max_attempts,
        negative_marking=exam_in.negative_marking,
        negative_mark_value=exam_in.negative_mark_value,
        partial_credit=exam_in.partial_credit,
        instructions=exam_in.instructions,
        is_published=False,
        results_published=False
    )
    db.add(exam)
    db.commit()
    db.refresh(exam)

    # Add question associations
    for idx, q in enumerate(questions, start=1):
        db.add(ExamQuestion(
            exam_id=exam.id,
            question_id=q.id,
            order_index=idx,
            marks_override=q.marks
        ))
    db.commit()

    log_audit_event(
        db=db,
        action="CREATE_EXAM",
        resource_type="EXAM",
        user_id=current_user.id,
        resource_id=str(exam.id),
        details={"title": exam.title, "course_id": exam.course_id}
    )
    return {"message": "Examination created successfully", "id": exam.id}

@router.get("/{exam_id}")
def get_examination(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    # If student, verify enrollment and omit sensitive answer keys
    if current_user.role == UserRole.STUDENT:
        enrollment = db.query(Enrollment).filter(
            Enrollment.course_id == exam.course_id,
            Enrollment.student_id == current_user.id
        ).first()
        if not enrollment:
            raise HTTPException(status_code=403, detail="Not enrolled in this examination course")

        return {
            "id": exam.id,
            "title": exam.title,
            "description": exam.description,
            "course_id": exam.course_id,
            "course_name": exam.course.name if exam.course else "",
            "start_time": exam.start_time,
            "end_time": exam.end_time,
            "duration_minutes": exam.duration_minutes,
            "total_marks": exam.total_marks,
            "passing_marks": exam.passing_marks,
            "instructions": exam.instructions,
            "is_published": exam.is_published,
            "results_published": exam.results_published
        }

    # Teacher / Admin view with question list
    questions_list = []
    for eq in exam.exam_questions:
        q = eq.question
        questions_list.append({
            "id": q.id,
            "topic": q.topic,
            "difficulty": q.difficulty.value,
            "question_type": q.question_type.value,
            "question_text": q.question_text,
            "marks": eq.marks_override or q.marks,
            "order_index": eq.order_index
        })

    return {
        "id": exam.id,
        "title": exam.title,
        "description": exam.description,
        "course_id": exam.course_id,
        "course_name": exam.course.name if exam.course else "",
        "teacher_id": exam.teacher_id,
        "teacher_name": exam.teacher.full_name if exam.teacher else "",
        "start_time": exam.start_time,
        "end_time": exam.end_time,
        "duration_minutes": exam.duration_minutes,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "randomize_questions": exam.randomize_questions,
        "randomize_options": exam.randomize_options,
        "max_attempts": exam.max_attempts,
        "negative_marking": exam.negative_marking,
        "negative_mark_value": exam.negative_mark_value,
        "partial_credit": exam.partial_credit,
        "instructions": exam.instructions,
        "is_published": exam.is_published,
        "results_published": exam.results_published,
        "questions": questions_list
    }

@router.post("/{exam_id}/publish")
def publish_examination(
    exam_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    exam.is_published = True
    db.commit()

    # Notify enrolled students
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == exam.course_id).all()
    for e in enrollments:
        db.add(Notification(
            user_id=e.student_id,
            title="New Exam Available",
            message=f"Exam '{exam.title}' has been published and is ready for attempt.",
            notification_type=NotificationType.EXAM_ASSIGNED,
            link_url="/exams"
        ))
    db.commit()

    log_audit_event(
        db=db,
        action="PUBLISH_EXAM",
        resource_type="EXAM",
        user_id=current_user.id,
        resource_id=str(exam.id)
    )
    return {"message": "Examination published successfully"}

@router.post("/{exam_id}/publish-results")
def publish_exam_results(
    exam_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    exam.results_published = True
    db.commit()

    # Notify all students who attempted the exam
    attempts = db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam.id).all()
    for a in attempts:
        db.add(Notification(
            user_id=a.student_id,
            title="Examination Results Published",
            message=f"Results for '{exam.title}' have been published. Your score: {a.percentage}%",
            notification_type=NotificationType.RESULT_PUBLISHED,
            link_url="/results"
        ))
    db.commit()

    log_audit_event(
        db=db,
        action="PUBLISH_RESULTS",
        resource_type="EXAM",
        user_id=current_user.id,
        resource_id=str(exam.id)
    )
    return {"message": "Examination results published successfully"}

@router.get("/{exam_id}/analytics")
def get_exam_analytics_report(
    exam_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    stats = get_exam_analytics(db, exam_id)
    return stats
