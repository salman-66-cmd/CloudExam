from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
import csv
import io
from backend.app.core.database import get_db
from backend.app.models.models import ExamAttempt, Examination, User, UserRole, AttemptStatus
from backend.app.api.deps import get_current_user, get_current_teacher_or_admin

router = APIRouter()

@router.get("/")
def list_results(
    exam_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(ExamAttempt).filter(
        ExamAttempt.status.in_([AttemptStatus.EVALUATED, AttemptStatus.SUBMITTED])
    )

    if current_user.role == UserRole.STUDENT:
        # Students ONLY see their own attempts where results_published is true
        query = query.join(Examination).filter(
            ExamAttempt.student_id == current_user.id,
            Examination.results_published == True
        )
    elif current_user.role == UserRole.TEACHER:
        query = query.join(Examination).filter(Examination.teacher_id == current_user.id)

    if exam_id:
        query = query.filter(ExamAttempt.exam_id == exam_id)

    attempts = query.order_by(ExamAttempt.submitted_at.desc()).all()
    results = []

    for a in attempts:
        exam = a.examination
        results.append({
            "attempt_id": a.id,
            "exam_id": exam.id,
            "exam_title": exam.title,
            "course_name": exam.course.name if exam.course else "",
            "student_id": a.student_id,
            "student_name": a.student.full_name if a.student else "Student",
            "score_obtained": a.score_obtained,
            "total_marks": exam.total_marks,
            "percentage": a.percentage,
            "passed": a.passed,
            "status": a.status.value,
            "submitted_at": a.submitted_at,
            "results_published": exam.results_published,
            "teacher_feedback": a.teacher_feedback
        })

    return results

@router.get("/export")
def export_results_csv(
    exam_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        raise HTTPException(status_code=404, detail="Examination not found")

    attempts = db.query(ExamAttempt).filter(
        ExamAttempt.exam_id == exam_id,
        ExamAttempt.status.in_([AttemptStatus.EVALUATED, AttemptStatus.SUBMITTED])
    ).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Attempt ID", "Student Name", "Student Email", "Exam Title", 
        "Score Obtained", "Total Marks", "Percentage", "Result Status", "Submitted At"
    ])

    for a in attempts:
        writer.writerow([
            a.id,
            a.student.full_name if a.student else "Student",
            a.student.email if a.student else "N/A",
            exam.title,
            a.score_obtained,
            exam.total_marks,
            f"{a.percentage}%",
            "PASSED" if a.passed else "FAILED",
            a.submitted_at.isoformat() if a.submitted_at else "N/A"
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=results_exam_{exam_id}.csv"}
    )
