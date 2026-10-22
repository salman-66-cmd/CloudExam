from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from backend.app.models.models import (
    Examination, ExamAttempt, AttemptAnswer, Question, 
    ExamQuestion, AttemptStatus, User, Enrollment
)
from backend.app.services.evaluation_service import evaluate_attempt_objective_questions

def get_utc_now() -> datetime:
    return datetime.now(timezone.utc)

def start_or_resume_attempt(db: Session, exam_id: int, student_id: int) -> ExamAttempt:
    now = get_utc_now()
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    if not exam.is_published:
        raise HTTPException(status_code=400, detail="Examination is not published yet")

    # Ensure start_time and end_time have timezone
    exam_start = exam.start_time if exam.start_time.tzinfo else exam.start_time.replace(tzinfo=timezone.utc)
    exam_end = exam.end_time if exam.end_time.tzinfo else exam.end_time.replace(tzinfo=timezone.utc)

    # Check timing
    if now < exam_start:
        raise HTTPException(
            status_code=400, 
            detail=f"Examination has not started yet. Starts at {exam_start.isoformat()}"
        )
    if now > exam_end:
        raise HTTPException(
            status_code=400, 
            detail="Examination window has closed"
        )

    # Check enrollment in the course
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == exam.course_id,
        Enrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=403, detail="Student is not enrolled in this course")

    # Check existing attempts
    existing_attempts = db.query(ExamAttempt).filter(
        ExamAttempt.exam_id == exam_id,
        ExamAttempt.student_id == student_id
    ).order_by(ExamAttempt.attempt_number.desc()).all()

    # If there is an active IN_PROGRESS attempt, resume it!
    for att in existing_attempts:
        if att.status == AttemptStatus.IN_PROGRESS:
            att_deadline = att.deadline if att.deadline.tzinfo else att.deadline.replace(tzinfo=timezone.utc)
            if now > att_deadline:
                # Deadline expired, auto-submit
                att.status = AttemptStatus.EXPIRED
                att.submitted_at = att_deadline
                db.commit()
                evaluate_attempt_objective_questions(db, att)
            else:
                return att

    # Check max attempts limit
    completed_count = len([a for a in existing_attempts if a.status != AttemptStatus.IN_PROGRESS])
    if completed_count >= exam.max_attempts:
        raise HTTPException(
            status_code=400, 
            detail=f"Maximum attempts ({exam.max_attempts}) reached for this examination"
        )

    # Calculate authoritative server-side deadline
    max_duration_deadline = now + timedelta(minutes=exam.duration_minutes)
    authoritative_deadline = min(max_duration_deadline, exam_end)

    new_attempt = ExamAttempt(
        exam_id=exam_id,
        student_id=student_id,
        attempt_number=completed_count + 1,
        status=AttemptStatus.IN_PROGRESS,
        started_at=now,
        deadline=authoritative_deadline,
        score_obtained=0.0,
        percentage=0.0,
        passed=False
    )
    db.add(new_attempt)
    db.commit()
    db.refresh(new_attempt)

    # Pre-populate empty attempt answers for all exam questions
    exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
    for eq in exam_questions:
        ans = AttemptAnswer(
            attempt_id=new_attempt.id,
            question_id=eq.question_id,
            selected_option_ids=[],
            text_response="",
            is_marked_for_review=False,
            is_evaluated=False,
            marks_awarded=0.0
        )
        db.add(ans)
    db.commit()

    return new_attempt

def save_answer(
    db: Session, 
    attempt_id: int, 
    question_id: int, 
    student_id: int,
    selected_option_ids: List[int],
    text_response: Optional[str] = None,
    is_marked_for_review: bool = False
) -> AttemptAnswer:
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.student_id == student_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    if attempt.status != AttemptStatus.IN_PROGRESS:
        raise HTTPException(status_code=400, detail="Cannot save answers for completed or expired attempt")

    # Authoritative deadline check
    now = get_utc_now()
    deadline = attempt.deadline if attempt.deadline.tzinfo else attempt.deadline.replace(tzinfo=timezone.utc)
    if now > deadline:
        attempt.status = AttemptStatus.EXPIRED
        attempt.submitted_at = deadline
        db.commit()
        evaluate_attempt_objective_questions(db, attempt)
        raise HTTPException(status_code=400, detail="Examination time limit has expired. Attempt auto-submitted.")

    answer = db.query(AttemptAnswer).filter(
        AttemptAnswer.attempt_id == attempt_id,
        AttemptAnswer.question_id == question_id
    ).first()

    if not answer:
        answer = AttemptAnswer(
            attempt_id=attempt_id,
            question_id=question_id,
            selected_option_ids=selected_option_ids,
            text_response=text_response,
            is_marked_for_review=is_marked_for_review,
            saved_at=now
        )
        db.add(answer)
    else:
        answer.selected_option_ids = selected_option_ids
        answer.text_response = text_response
        answer.is_marked_for_review = is_marked_for_review
        answer.saved_at = now

    db.commit()
    db.refresh(answer)
    return answer

def submit_attempt(db: Session, attempt_id: int, student_id: int) -> ExamAttempt:
    attempt = db.query(ExamAttempt).filter(
        ExamAttempt.id == attempt_id,
        ExamAttempt.student_id == student_id
    ).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Idempotent submission: if already submitted, return existing attempt
    if attempt.status in [AttemptStatus.SUBMITTED, AttemptStatus.EVALUATED]:
        return attempt

    now = get_utc_now()
    attempt.submitted_at = now
    attempt.status = AttemptStatus.SUBMITTED
    db.commit()

    # Trigger objective evaluations
    updated_attempt = evaluate_attempt_objective_questions(db, attempt)
    return updated_attempt
