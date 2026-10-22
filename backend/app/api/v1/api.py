from fastapi import APIRouter
from backend.app.api.v1.endpoints import (
    auth, users, courses, questions, exams, attempts, 
    evaluations, results, analytics, notifications, audit, system
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(courses.router, prefix="/courses", tags=["Courses & Enrollments"])
api_router.include_router(questions.router, prefix="/questions", tags=["Question Bank"])
api_router.include_router(exams.router, prefix="/exams", tags=["Examinations"])
api_router.include_router(attempts.router, prefix="/attempts", tags=["Examination Attempts & Engine"])
api_router.include_router(evaluations.router, prefix="/evaluations", tags=["Subjective Evaluation"])
api_router.include_router(results.router, prefix="/results", tags=["Results & Grade Exports"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics & Reporting"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
api_router.include_router(audit.router, prefix="/audit", tags=["Audit Logs"])
api_router.include_router(system.router, prefix="/system", tags=["System Health & Settings"])
