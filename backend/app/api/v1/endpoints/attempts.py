from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import (
    ExamAttempt, AttemptAnswer, Examination, Question, QuestionOption, 
    ExamQuestion, AttemptStatus, User, UserRole
)
from backend.app.schemas.schemas import (
    AttemptAnswerSave, AttemptAnswerResponse, ExamAttemptResponse
)
from backend.app.api.deps import get_current_user, get_current_teacher_or_admin
from backend.app.services.exam_engine import start_or_resume_attempt, save_answer, submit_attempt
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

def get_utc_now():
    return datetime.now(timezone.utc)

@router.post("/exams/{exam_id}/attempts", response_model=Dict[str, Any])
def start_exam_attempt(
    exam_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = start_or_resume_attempt(db, exam_id=exam_id, student_id=current_user.id)
    
    log_audit_event(
        db=db,
        action="START_EXAM_ATTEMPT",
        resource_type="ATTEMPT",
        user_id=current_user.id,
        resource_id=str(attempt.id),
        details={"exam_id": exam_id, "attempt_number": attempt.attempt_number}
    )

    return {
        "message": "Attempt started successfully",
        "attempt_id": attempt.id,
        "status": attempt.status.value,
        "deadline": attempt.deadline.isoformat()
    }

@router.get("/{attempt_id}")
def get_attempt_state(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    # Access control: only the student who owns the attempt or a teacher/admin can view it
    if current_user.role == UserRole.STUDENT and attempt.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this examination attempt")

    now = get_utc_now()
    deadline = attempt.deadline if attempt.deadline.tzinfo else attempt.deadline.replace(tzinfo=timezone.utc)
    remaining_seconds = max(0, int((deadline - now).total_seconds()))

    exam = attempt.examination

    # Fetch exam questions in order
    exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam.id).order_by(ExamQuestion.order_index).all()
    questions_data = []

    for eq in exam_questions:
        q: Question = eq.question
        # Sanitize options: during an active attempt, NEVER expose is_correct!
        options = []
        for opt in q.options:
            options.append({
                "id": opt.id,
                "option_text": opt.option_text,
                "order_index": opt.order_index
            })

        questions_data.append({
            "id": q.id,
            "topic": q.topic,
            "difficulty": q.difficulty.value,
            "question_type": q.question_type.value,
            "question_text": q.question_text,
            "marks": eq.marks_override or q.marks,
            "order_index": eq.order_index,
            "options": options
        })

    # Fetch saved answers
    saved_answers = {}
    for ans in attempt.answers:
        saved_answers[ans.question_id] = {
            "selected_option_ids": ans.selected_option_ids or [],
            "text_response": ans.text_response or "",
            "is_marked_for_review": ans.is_marked_for_review,
            "is_evaluated": ans.is_evaluated,
            "marks_awarded": ans.marks_awarded
        }

    return {
        "attempt": {
            "id": attempt.id,
            "exam_id": attempt.exam_id,
            "exam_title": exam.title,
            "student_id": attempt.student_id,
            "student_name": attempt.student.full_name if attempt.student else "",
            "attempt_number": attempt.attempt_number,
            "status": attempt.status.value,
            "started_at": attempt.started_at,
            "deadline": attempt.deadline,
            "remaining_seconds": remaining_seconds,
            "submitted_at": attempt.submitted_at,
            "score_obtained": attempt.score_obtained,
            "percentage": attempt.percentage,
            "passed": attempt.passed,
            "total_marks": exam.total_marks
        },
        "questions": questions_data,
        "answers": saved_answers
    }

@router.put("/{attempt_id}/answers/{question_id}")
def autosave_attempt_answer(
    attempt_id: int,
    question_id: int,
    answer_in: AttemptAnswerSave,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    saved_ans = save_answer(
        db=db,
        attempt_id=attempt_id,
        question_id=question_id,
        student_id=current_user.id,
        selected_option_ids=answer_in.selected_option_ids,
        text_response=answer_in.text_response,
        is_marked_for_review=answer_in.is_marked_for_review
    )
    return {
        "status": "saved",
        "question_id": question_id,
        "saved_at": saved_ans.saved_at.isoformat()
    }

@router.post("/{attempt_id}/submit")
def submit_exam_attempt(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    submitted_att = submit_attempt(db, attempt_id=attempt_id, student_id=current_user.id)
    
    log_audit_event(
        db=db,
        action="SUBMIT_EXAM",
        resource_type="ATTEMPT",
        user_id=current_user.id,
        resource_id=str(attempt_id),
        details={
            "score_obtained": submitted_att.score_obtained,
            "status": submitted_att.status.value,
            "passed": submitted_att.passed
        }
    )

    return {
        "message": "Examination submitted successfully",
        "status": submitted_att.status.value,
        "submitted_at": submitted_att.submitted_at.isoformat() if submitted_att.submitted_at else None,
        "score_obtained": submitted_att.score_obtained if submitted_att.examination.results_published else None
    }

@router.get("/{attempt_id}/result")
def get_attempt_result(
    attempt_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    exam = attempt.examination

    if current_user.role == UserRole.STUDENT:
        if attempt.student_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized to view another student's result")
        if not exam.results_published:
            raise HTTPException(status_code=403, detail="Examination results have not been published yet by the instructor.")

    # Build question-level breakdown
    breakdown = []
    for ans in attempt.answers:
        q: Question = ans.question
        options_data = []
        for opt in q.options:
            options_data.append({
                "id": opt.id,
                "option_text": opt.option_text,
                "is_correct": opt.is_correct if exam.results_published or current_user.role != UserRole.STUDENT else None
            })

        breakdown.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type.value,
            "max_marks": q.marks,
            "marks_awarded": ans.marks_awarded,
            "selected_option_ids": ans.selected_option_ids,
            "text_response": ans.text_response,
            "explanation": q.explanation if exam.results_published else None,
            "feedback": ans.feedback,
            "options": options_data
        })

    return {
        "attempt_id": attempt.id,
        "exam_id": exam.id,
        "exam_title": exam.title,
        "student_name": attempt.student.full_name if attempt.student else "Student",
        "score_obtained": attempt.score_obtained,
        "total_marks": exam.total_marks,
        "percentage": attempt.percentage,
        "passed": attempt.passed,
        "status": attempt.status.value,
        "submitted_at": attempt.submitted_at,
        "teacher_feedback": attempt.teacher_feedback,
        "breakdown": breakdown
    }
