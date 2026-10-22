from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import User, UserRole, Examination, ExamAttempt, AttemptStatus
from backend.app.api.deps import get_current_user
from backend.app.services.analytics_service import get_admin_dashboard_metrics

router = APIRouter()

@router.get("/dashboard")
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if current_user.role == UserRole.ADMIN:
        return get_admin_dashboard_metrics(db)

    elif current_user.role == UserRole.TEACHER:
        # Teacher metrics
        exams = db.query(Examination).filter(Examination.teacher_id == current_user.id).all()
        total_exams = len(exams)
        exam_ids = [e.id for e in exams]

        attempts = db.query(ExamAttempt).filter(ExamAttempt.exam_id.in_(exam_ids)).all()
        total_attempts = len(attempts)
        pending_evals = len([a for a in attempts if a.status == AttemptStatus.SUBMITTED])
        evaluated = [a for a in attempts if a.status == AttemptStatus.EVALUATED]

        avg_score = round(sum(a.percentage for a in evaluated) / len(evaluated), 1) if evaluated else 0.0

        return {
            "stats": {
                "total_exams_created": total_exams,
                "total_student_attempts": total_attempts,
                "pending_evaluations": pending_evals,
                "average_class_score": avg_score
            },
            "recent_attempts": [
                {
                    "attempt_id": a.id,
                    "student_name": a.student.full_name if a.student else "Student",
                    "exam_title": a.examination.title if a.examination else "Exam",
                    "score": a.score_obtained,
                    "status": a.status.value,
                    "submitted_at": a.submitted_at.isoformat() if a.submitted_at else None
                } for a in attempts[-6:]
            ]
        }

    else:
        # Student metrics
        attempts = db.query(ExamAttempt).filter(ExamAttempt.student_id == current_user.id).all()
        completed = [a for a in attempts if a.status in [AttemptStatus.EVALUATED, AttemptStatus.SUBMITTED]]
        passed_count = len([a for a in completed if a.passed])

        return {
            "stats": {
                "total_attempts": len(attempts),
                "completed_exams": len(completed),
                "passed_exams": passed_count,
                "average_percentage": round(sum(a.percentage for a in completed) / len(completed), 1) if completed else 0.0
            }
        }
