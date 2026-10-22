from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.models.models import (
    User, UserRole, Course, Examination, ExamAttempt, AttemptStatus, 
    Question, ExamQuestion, AttemptAnswer
)

def get_admin_dashboard_metrics(db: Session) -> Dict[str, Any]:
    now = datetime.now(timezone.utc)
    total_students = db.query(User).filter(User.role == UserRole.STUDENT).count()
    total_teachers = db.query(User).filter(User.role == UserRole.TEACHER).count()
    active_courses = db.query(Course).filter(Course.status == "ACTIVE").count()

    total_exams = db.query(Examination).count()
    scheduled_exams = db.query(Examination).filter(Examination.start_time > now).count()
    ongoing_exams = db.query(Examination).filter(Examination.start_time <= now, Examination.end_time >= now).count()
    completed_exams = db.query(Examination).filter(Examination.end_time < now).count()

    attempts = db.query(ExamAttempt).all()
    total_attempts = len(attempts)
    evaluated_attempts = [a for a in attempts if a.status in [AttemptStatus.EVALUATED, AttemptStatus.SUBMITTED]]
    
    passed_count = len([a for a in evaluated_attempts if a.passed])
    pass_rate = round((passed_count / len(evaluated_attempts) * 100), 1) if evaluated_attempts else 0.0
    avg_score = round(sum(a.percentage for a in evaluated_attempts) / len(evaluated_attempts), 1) if evaluated_attempts else 0.0

    # Score distribution brackets
    score_brackets = {"0-40%": 0, "41-60%": 0, "61-80%": 0, "81-100%": 0}
    for a in evaluated_attempts:
        pct = a.percentage
        if pct <= 40:
            score_brackets["0-40%"] += 1
        elif pct <= 60:
            score_brackets["41-60%"] += 1
        elif pct <= 80:
            score_brackets["61-80%"] += 1
        else:
            score_brackets["81-100%"] += 1

    distribution_data = [{"range": k, "count": v} for k, v in score_brackets.items()]

    return {
        "stats": {
            "total_students": total_students,
            "total_teachers": total_teachers,
            "active_courses": active_courses,
            "total_exams": total_exams,
            "scheduled_exams": scheduled_exams,
            "ongoing_exams": ongoing_exams,
            "completed_exams": completed_exams,
            "total_attempts": total_attempts,
            "pass_rate": pass_rate,
            "avg_score": avg_score
        },
        "score_distribution": distribution_data,
        "recent_activity": [
            {
                "id": a.id,
                "student_name": a.student.full_name if a.student else "Student",
                "exam_title": a.examination.title if a.examination else "Exam",
                "status": a.status.value,
                "score": a.score_obtained,
                "percentage": a.percentage,
                "passed": a.passed,
                "submitted_at": a.submitted_at.isoformat() if a.submitted_at else a.started_at.isoformat()
            } for a in attempts[-8:]
        ]
    }

def get_exam_analytics(db: Session, exam_id: int) -> Dict[str, Any]:
    exam = db.query(Examination).filter(Examination.id == exam_id).first()
    if not exam:
        return {}

    attempts = db.query(ExamAttempt).filter(ExamAttempt.exam_id == exam_id).all()
    evaluated = [a for a in attempts if a.status in [AttemptStatus.EVALUATED, AttemptStatus.SUBMITTED]]

    scores = [a.score_obtained for a in evaluated]
    percentages = [a.percentage for a in evaluated]

    avg_score = round(sum(scores) / len(scores), 2) if scores else 0.0
    highest_score = round(max(scores), 2) if scores else 0.0
    lowest_score = round(min(scores), 2) if scores else 0.0
    passed_count = len([a for a in evaluated if a.passed])
    pass_rate = round((passed_count / len(evaluated) * 100), 1) if evaluated else 0.0

    # Question-wise performance
    exam_questions = db.query(ExamQuestion).filter(ExamQuestion.exam_id == exam_id).all()
    question_stats = []
    for eq in exam_questions:
        q: Question = eq.question
        answers = db.query(AttemptAnswer).filter(
            AttemptAnswer.question_id == q.id,
            AttemptAnswer.attempt_id.in_([a.id for a in evaluated])
        ).all()
        
        total_answers = len(answers)
        correct_answers = len([ans for ans in answers if ans.marks_awarded >= q.marks])
        accuracy = round((correct_answers / total_answers * 100), 1) if total_answers else 0.0

        question_stats.append({
            "question_id": q.id,
            "topic": q.topic,
            "difficulty": q.difficulty.value,
            "type": q.question_type.value,
            "marks": q.marks,
            "total_answered": total_answers,
            "accuracy": accuracy
        })

    return {
        "exam_id": exam.id,
        "exam_title": exam.title,
        "total_attempts": len(attempts),
        "evaluated_count": len(evaluated),
        "avg_score": avg_score,
        "highest_score": highest_score,
        "lowest_score": lowest_score,
        "pass_rate": pass_rate,
        "total_marks": exam.total_marks,
        "passing_marks": exam.passing_marks,
        "question_stats": question_stats
    }
