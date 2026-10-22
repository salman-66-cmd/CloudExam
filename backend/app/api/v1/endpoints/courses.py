from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import Course, Subject, Enrollment, User, UserRole
from backend.app.schemas.schemas import (
    CourseCreate, CourseUpdate, CourseResponse, 
    SubjectCreate, SubjectResponse, EnrollmentCreate, 
    EnrollmentResponse, BulkEnrollmentCreate, UserResponse
)
from backend.app.api.deps import get_current_user, get_current_teacher_or_admin, get_current_admin
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

# --- Subjects ---
@router.get("/subjects", response_model=List[SubjectResponse])
def list_subjects(db: Session = Depends(get_db)):
    return db.query(Subject).all()

@router.post("/subjects", response_model=SubjectResponse)
def create_subject(
    sub_in: SubjectCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    if db.query(Subject).filter((Subject.code == sub_in.code) | (Subject.name == sub_in.name)).first():
        raise HTTPException(status_code=400, detail="Subject code or name already exists")
    
    subject = Subject(**sub_in.model_dump())
    db.add(subject)
    db.commit()
    db.refresh(subject)
    return subject

# --- Courses ---
@router.get("/", response_model=List[CourseResponse])
def list_courses(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(Course)
    if current_user.role == UserRole.TEACHER:
        # Teachers see courses they teach or all active
        query = query.filter((Course.teacher_id == current_user.id) | (Course.status == "ACTIVE"))
    elif current_user.role == UserRole.STUDENT:
        # Students see courses they are enrolled in
        enrolled_course_ids = db.query(Enrollment.course_id).filter(Enrollment.student_id == current_user.id).subquery()
        query = query.filter(Course.id.in_(enrolled_course_ids))

    courses = query.all()
    results = []
    for c in courses:
        enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == c.id).count()
        results.append(
            CourseResponse(
                id=c.id,
                code=c.code,
                name=c.name,
                description=c.description,
                academic_term=c.academic_term,
                teacher_id=c.teacher_id,
                teacher_name=c.teacher.full_name if c.teacher else "Instructor",
                status=c.status,
                enrolled_count=enrolled_count,
                created_at=c.created_at
            )
        )
    return results

@router.post("/", response_model=CourseResponse)
def create_course(
    course_in: CourseCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    if db.query(Course).filter(Course.code == course_in.code).first():
        raise HTTPException(status_code=400, detail="Course code already exists")

    teacher_id = course_in.teacher_id or current_user.id
    if current_user.role == UserRole.TEACHER:
        teacher_id = current_user.id

    course = Course(
        code=course_in.code,
        name=course_in.name,
        description=course_in.description,
        academic_term=course_in.academic_term,
        teacher_id=teacher_id,
        status=course_in.status
    )
    db.add(course)
    db.commit()
    db.refresh(course)

    log_audit_event(
        db=db,
        action="CREATE_COURSE",
        resource_type="COURSE",
        user_id=current_user.id,
        resource_id=str(course.id),
        details={"code": course.code, "name": course.name}
    )

    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        description=course.description,
        academic_term=course.academic_term,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher.full_name if course.teacher else "Instructor",
        status=course.status,
        enrolled_count=0,
        created_at=course.created_at
    )

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        description=course.description,
        academic_term=course.academic_term,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher.full_name if course.teacher else "Instructor",
        status=course.status,
        enrolled_count=enrolled_count,
        created_at=course.created_at
    )

@router.patch("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int,
    course_in: CourseUpdate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only edit your own courses")

    for k, v in course_in.model_dump(exclude_unset=True).items():
        setattr(course, k, v)

    db.commit()
    db.refresh(course)

    enrolled_count = db.query(Enrollment).filter(Enrollment.course_id == course.id).count()
    return CourseResponse(
        id=course.id,
        code=course.code,
        name=course.name,
        description=course.description,
        academic_term=course.academic_term,
        teacher_id=course.teacher_id,
        teacher_name=course.teacher.full_name if course.teacher else "Instructor",
        status=course.status,
        enrolled_count=enrolled_count,
        created_at=course.created_at
    )

@router.delete("/{course_id}")
def delete_course(
    course_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if current_user.role == UserRole.TEACHER and course.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Can only delete your own courses")

    db.delete(course)
    db.commit()
    return {"message": "Course successfully deleted"}

# --- Course Enrollments ---
@router.get("/{course_id}/students", response_model=List[UserResponse])
def get_enrolled_students(
    course_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    students = [e.student for e in enrollments if e.student]
    return students

@router.post("/{course_id}/enrollments")
def enroll_student(
    course_id: int,
    enroll_in: EnrollmentCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    student = db.query(User).filter(User.id == enroll_in.student_id, User.role == UserRole.STUDENT).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    existing = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.student_id == student.id
    ).first()
    if existing:
        return {"message": "Student already enrolled"}

    enrollment = Enrollment(course_id=course_id, student_id=student.id)
    db.add(enrollment)
    db.commit()

    log_audit_event(
        db=db,
        action="ENROLL_STUDENT",
        resource_type="COURSE",
        user_id=current_user.id,
        resource_id=str(course_id),
        details={"student_id": student.id, "student_name": student.full_name}
    )
    return {"message": "Student successfully enrolled", "enrollment_id": enrollment.id}

@router.delete("/{course_id}/enrollments/{student_id}")
def remove_student_enrollment(
    course_id: int,
    student_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    enrollment = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.student_id == student_id
    ).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    db.delete(enrollment)
    db.commit()
    return {"message": "Student removed from course"}
