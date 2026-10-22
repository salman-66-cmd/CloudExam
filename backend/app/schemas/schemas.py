from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any, Dict
from datetime import datetime
from backend.app.models.models import (
    UserRole, QuestionType, DifficultyLevel, AttemptStatus, NotificationType
)

# Authentication & Tokens
class Token(BaseModel):
    access_token: str
    token_type: str
    user: "UserResponse"

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

# Users
class UserBase(BaseModel):
    email: EmailStr
    username: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True

class UserCreate(UserBase):
    password: str

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None
    password: Optional[str] = None

class UserStatusUpdate(BaseModel):
    is_active: bool

class UserResponse(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Subjects
class SubjectBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None

class SubjectCreate(SubjectBase):
    pass

class SubjectResponse(SubjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Courses
class CourseBase(BaseModel):
    code: str
    name: str
    description: Optional[str] = None
    academic_term: str = "Spring 2026"
    status: str = "ACTIVE"

class CourseCreate(CourseBase):
    teacher_id: Optional[int] = None

class CourseUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    academic_term: Optional[str] = None
    teacher_id: Optional[int] = None
    status: Optional[str] = None

class CourseResponse(CourseBase):
    id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    enrolled_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True

class EnrollmentCreate(BaseModel):
    student_id: int

class BulkEnrollmentCreate(BaseModel):
    student_ids: List[int]

class EnrollmentResponse(BaseModel):
    id: int
    course_id: int
    student_id: int
    student: Optional[UserResponse] = None
    enrolled_at: datetime

    class Config:
        from_attributes = True

# Questions & Options
class QuestionOptionCreate(BaseModel):
    option_text: str
    is_correct: bool = False
    order_index: int = 0

class QuestionOptionResponse(BaseModel):
    id: int
    option_text: str
    is_correct: Optional[bool] = None  # None for student view
    order_index: int

    class Config:
        from_attributes = True

class QuestionBase(BaseModel):
    topic: str = "General"
    difficulty: DifficultyLevel = DifficultyLevel.MEDIUM
    question_type: QuestionType
    question_text: str
    marks: float = 1.0
    explanation: Optional[str] = None
    model_answer: Optional[str] = None

class QuestionCreate(QuestionBase):
    subject_id: Optional[int] = None
    course_id: Optional[int] = None
    options: List[QuestionOptionCreate] = []

class QuestionUpdate(BaseModel):
    topic: Optional[str] = None
    difficulty: Optional[DifficultyLevel] = None
    question_type: Optional[QuestionType] = None
    question_text: Optional[str] = None
    marks: Optional[float] = None
    explanation: Optional[str] = None
    model_answer: Optional[str] = None
    options: Optional[List[QuestionOptionCreate]] = None

class QuestionResponse(QuestionBase):
    id: int
    teacher_id: int
    subject_id: Optional[int] = None
    course_id: Optional[int] = None
    options: List[QuestionOptionResponse] = []
    created_at: datetime

    class Config:
        from_attributes = True

# Examinations
class ExamQuestionCreate(BaseModel):
    question_id: int
    order_index: int = 0
    marks_override: Optional[float] = None

class ExaminationBase(BaseModel):
    title: str
    description: Optional[str] = None
    course_id: int
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    passing_marks: float = 0.0
    randomize_questions: bool = False
    randomize_options: bool = False
    max_attempts: int = 1
    negative_marking: bool = False
    negative_mark_value: float = 0.25
    partial_credit: bool = True
    instructions: Optional[str] = None

class ExaminationCreate(ExaminationBase):
    question_ids: List[int] = []

class ExaminationUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    passing_marks: Optional[float] = None
    randomize_questions: Optional[bool] = None
    randomize_options: Optional[bool] = None
    max_attempts: Optional[int] = None
    negative_marking: Optional[bool] = None
    negative_mark_value: Optional[float] = None
    partial_credit: Optional[bool] = None
    instructions: Optional[str] = None
    is_published: Optional[bool] = None
    results_published: Optional[bool] = None
    question_ids: Optional[List[int]] = None

class ExaminationResponse(ExaminationBase):
    id: int
    teacher_id: int
    teacher_name: Optional[str] = None
    course_name: Optional[str] = None
    total_marks: float
    is_published: bool
    results_published: bool
    question_count: int = 0
    created_at: datetime
    status_label: Optional[str] = None

    class Config:
        from_attributes = True

class ExaminationStudentView(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    course_id: int
    course_name: Optional[str] = None
    start_time: datetime
    end_time: datetime
    duration_minutes: int
    total_marks: float
    passing_marks: float
    instructions: Optional[str] = None
    status_label: str
    has_attempted: bool = False
    attempt_status: Optional[str] = None
    attempt_id: Optional[int] = None
    score_obtained: Optional[float] = None
    results_published: bool = False

# Attempts & Answering
class AttemptAnswerSave(BaseModel):
    selected_option_ids: List[int] = []
    text_response: Optional[str] = None
    is_marked_for_review: bool = False

class AttemptAnswerResponse(BaseModel):
    id: int
    question_id: int
    selected_option_ids: List[int]
    text_response: Optional[str] = None
    is_marked_for_review: bool
    is_evaluated: bool
    marks_awarded: float
    feedback: Optional[str] = None
    saved_at: datetime

    class Config:
        from_attributes = True

class ExamAttemptResponse(BaseModel):
    id: int
    exam_id: int
    exam_title: Optional[str] = None
    student_id: int
    student_name: Optional[str] = None
    attempt_number: int
    status: AttemptStatus
    started_at: datetime
    deadline: datetime
    remaining_seconds: int
    submitted_at: Optional[datetime] = None
    score_obtained: float
    percentage: float
    passed: bool
    teacher_feedback: Optional[str] = None
    total_marks: float = 0.0

    class Config:
        from_attributes = True

class ActiveAttemptStateResponse(BaseModel):
    attempt: ExamAttemptResponse
    questions: List[Dict[str, Any]]
    answers: Dict[int, AttemptAnswerSave]

# Evaluation
class EvaluationItemUpdate(BaseModel):
    question_id: int
    marks_awarded: float
    feedback: Optional[str] = None

class SubjectiveEvaluationSubmit(BaseModel):
    overall_feedback: Optional[str] = None
    evaluations: List[EvaluationItemUpdate]

# Analytics & Audits
class AdminDashboardStats(BaseModel):
    total_students: int
    total_teachers: int
    active_courses: int
    scheduled_exams: int
    ongoing_exams: int
    completed_exams: int
    total_attempts: int
    pass_rate: float
    avg_score: float

class NotificationResponse(BaseModel):
    id: int
    user_id: int
    title: str
    message: str
    notification_type: NotificationType
    link_url: Optional[str] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    action: str
    resource_type: str
    resource_id: Optional[str] = None
    details: Optional[Any] = None
    ip_address: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

Token.model_rebuild()
