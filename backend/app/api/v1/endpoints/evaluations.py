from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import (
    ExamAttempt, AttemptAnswer, Question, QuestionType, 
    AttemptStatus, User, UserRole, Examination
)
from backend.app.schemas.schemas import SubjectiveEvaluationSubmit
from backend.app.api.deps import get_current_teacher_or_admin
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/pending")
def list_pending_evaluations(
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    """
    Returns attempts that have submitted status and contain unevaluated subjective questions.
    """
    query = db.query(ExamAttempt).filter(
        ExamAttempt.status.in_([AttemptStatus.SUBMITTED, AttemptStatus.EVALUATED])
    )
    if current_user.role == UserRole.TEACHER:
        query = query.join(Examination).filter(Examination.teacher_id == current_user.id)

    attempts = query.all()
    results = []

    for a in attempts:
        # Check if there are subjective questions
        has_subjective = False
        pending_subjective_count = 0
        for ans in a.answers:
            if ans.question.question_type in [QuestionType.SHORT_ANSWER, QuestionType.ESSAY]:
                has_subjective = True
                if not ans.is_evaluated:
                    pending_subjective_count += 1

        results.append({
            "attempt_id": a.id,
            "exam_id": a.exam_id,
            "exam_title": a.examination.title if a.examination else "",
            "student_id": a.student_id,
            "student_name": a.student.full_name if a.student else "Student",
            "submitted_at": a.submitted_at,
            "status": a.status.value,
            "score_obtained": a.score_obtained,
            "total_marks": a.examination.total_marks if a.examination else 0,
            "has_subjective": has_subjective,
            "pending_subjective_count": pending_subjective_count
        })

    return results

@router.get("/{attempt_id}")
def get_evaluation_detail(
    attempt_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    exam = attempt.examination
    items = []

    for ans in attempt.answers:
        q: Question = ans.question
        items.append({
            "question_id": q.id,
            "question_text": q.question_text,
            "question_type": q.question_type.value,
            "max_marks": q.marks,
            "marks_awarded": ans.marks_awarded,
            "is_evaluated": ans.is_evaluated,
            "student_response": ans.text_response if q.question_type in [QuestionType.SHORT_ANSWER, QuestionType.ESSAY] else None,
            "model_answer": q.model_answer or q.explanation,
            "teacher_feedback": ans.feedback
        })

    return {
        "attempt_id": attempt.id,
        "exam_title": exam.title,
        "student_name": attempt.student.full_name if attempt.student else "Student",
        "current_score": attempt.score_obtained,
        "total_marks": exam.total_marks,
        "teacher_feedback": attempt.teacher_feedback,
        "status": attempt.status.value,
        "items": items
    }

@router.post("/{attempt_id}/finalize")
def finalize_evaluation(
    attempt_id: int,
    eval_in: SubjectiveEvaluationSubmit,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    attempt = db.query(ExamAttempt).filter(ExamAttempt.id == attempt_id).first()
    if not attempt:
        raise HTTPException(status_code=404, detail="Attempt not found")

    exam = attempt.examination

    # Update individual question evaluations
    for item in eval_in.evaluations:
        ans = db.query(AttemptAnswer).filter(
            AttemptAnswer.attempt_id == attempt.id,
            AttemptAnswer.question_id == item.question_id
        ).first()
        if ans:
            ans.marks_awarded = min(float(item.marks_awarded), float(ans.question.marks))
            ans.feedback = item.feedback
            ans.is_evaluated = True
            ans.evaluated_by_id = current_user.id

    if eval_in.overall_feedback:
        attempt.teacher_feedback = eval_in.overall_feedback

    # Recalculate total score
    total_score = sum(ans.marks_awarded for ans in attempt.answers)
    attempt.score_obtained = max(0.0, round(total_score, 2))
    total_possible = float(exam.total_marks or 1.0)
    attempt.percentage = round((attempt.score_obtained / total_possible) * 100.0, 2)
    attempt.passed = attempt.score_obtained >= float(exam.passing_marks)
    attempt.status = AttemptStatus.EVALUATED

    db.commit()
    db.refresh(attempt)

    log_audit_event(
        db=db,
        action="EVALUATE_EXAM_ATTEMPT",
        resource_type="ATTEMPT",
        user_id=current_user.id,
        resource_id=str(attempt.id),
        details={"new_score": attempt.score_obtained, "percentage": attempt.percentage}
    )

    return {
        "message": "Evaluation finalized successfully",
        "attempt_id": attempt.id,
        "score_obtained": attempt.score_obtained,
        "percentage": attempt.percentage,
        "passed": attempt.passed
    }
