from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
import json
import csv
import io
from backend.app.core.database import get_db
from backend.app.models.models import (
    Question, QuestionOption, QuestionType, DifficultyLevel, User, UserRole, Subject, Course
)
from backend.app.schemas.schemas import (
    QuestionCreate, QuestionUpdate, QuestionResponse, QuestionOptionResponse
)
from backend.app.api.deps import get_current_teacher_or_admin, get_current_user
from backend.app.services.audit_service import log_audit_event

router = APIRouter()

@router.get("/", response_model=List[QuestionResponse])
def list_questions(
    subject_id: Optional[int] = None,
    course_id: Optional[int] = None,
    difficulty: Optional[DifficultyLevel] = None,
    question_type: Optional[QuestionType] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    query = db.query(Question)
    if subject_id:
        query = query.filter(Question.subject_id == subject_id)
    if course_id:
        query = query.filter(Question.course_id == course_id)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if question_type:
        query = query.filter(Question.question_type == question_type)
    if search:
        search_fmt = f"%{search}%"
        query = query.filter(
            (Question.question_text.ilike(search_fmt)) |
            (Question.topic.ilike(search_fmt))
        )
    return query.offset(skip).limit(limit).all()

@router.post("/", response_model=QuestionResponse)
def create_question(
    q_in: QuestionCreate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    new_q = Question(
        teacher_id=current_user.id,
        subject_id=q_in.subject_id,
        course_id=q_in.course_id,
        topic=q_in.topic,
        difficulty=q_in.difficulty,
        question_type=q_in.question_type,
        question_text=q_in.question_text,
        marks=q_in.marks,
        explanation=q_in.explanation,
        model_answer=q_in.model_answer
    )
    db.add(new_q)
    db.commit()
    db.refresh(new_q)

    # Add options if objective question
    if q_in.options:
        for idx, opt in enumerate(q_in.options, start=1):
            db.add(QuestionOption(
                question_id=new_q.id,
                option_text=opt.option_text,
                is_correct=opt.is_correct,
                order_index=opt.order_index or idx
            ))
        db.commit()
        db.refresh(new_q)

    log_audit_event(
        db=db,
        action="CREATE_QUESTION",
        resource_type="QUESTION",
        user_id=current_user.id,
        resource_id=str(new_q.id),
        details={"topic": new_q.topic, "type": new_q.question_type.value, "marks": new_q.marks}
    )
    return new_q

@router.get("/{question_id}", response_model=QuestionResponse)
def get_question(
    question_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")
    return q

@router.patch("/{question_id}", response_model=QuestionResponse)
def update_question(
    question_id: int,
    q_in: QuestionUpdate,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if current_user.role == UserRole.TEACHER and q.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot edit questions created by other teachers")

    update_data = q_in.model_dump(exclude_unset=True)
    options_data = update_data.pop("options", None)

    for k, v in update_data.items():
        setattr(q, k, v)

    if options_data is not None:
        # Replace options
        db.query(QuestionOption).filter(QuestionOption.question_id == q.id).delete()
        for idx, opt in enumerate(options_data, start=1):
            db.add(QuestionOption(
                question_id=q.id,
                option_text=opt.get("option_text"),
                is_correct=opt.get("is_correct", False),
                order_index=opt.get("order_index", idx)
            ))

    db.commit()
    db.refresh(q)
    return q

@router.delete("/{question_id}")
def delete_question(
    question_id: int,
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    q = db.query(Question).filter(Question.id == question_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Question not found")

    if current_user.role == UserRole.TEACHER and q.teacher_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot delete questions created by other teachers")

    db.delete(q)
    db.commit()
    return {"message": "Question deleted successfully"}

@router.post("/import")
async def import_questions(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_teacher_or_admin),
    db: Session = Depends(get_db)
):
    content = await file.read()
    text = content.decode("utf-8")
    imported_count = 0

    if file.filename.endswith(".json"):
        data = json.loads(text)
        if isinstance(data, list):
            for item in data:
                q = Question(
                    teacher_id=current_user.id,
                    topic=item.get("topic", "General"),
                    difficulty=item.get("difficulty", DifficultyLevel.MEDIUM),
                    question_type=item.get("question_type", QuestionType.MCQ_SINGLE),
                    question_text=item.get("question_text", ""),
                    marks=float(item.get("marks", 1.0)),
                    explanation=item.get("explanation"),
                    model_answer=item.get("model_answer")
                )
                db.add(q)
                db.commit()
                db.refresh(q)
                for opt in item.get("options", []):
                    db.add(QuestionOption(
                        question_id=q.id,
                        option_text=opt.get("option_text"),
                        is_correct=opt.get("is_correct", False),
                        order_index=opt.get("order_index", 0)
                    ))
                db.commit()
                imported_count += 1
    else:
        # CSV import
        reader = csv.DictReader(io.StringIO(text))
        for row in reader:
            q_type = row.get("question_type", "MCQ_SINGLE")
            q = Question(
                teacher_id=current_user.id,
                topic=row.get("topic", "General"),
                difficulty=row.get("difficulty", "MEDIUM"),
                question_type=q_type,
                question_text=row.get("question_text", ""),
                marks=float(row.get("marks", 1.0)),
                explanation=row.get("explanation", "")
            )
            db.add(q)
            db.commit()
            db.refresh(q)

            # Option A, B, C, D if present in CSV
            correct_opts = [c.strip().upper() for c in row.get("correct_options", "").split(",") if c.strip()]
            for letter in ["A", "B", "C", "D"]:
                col_name = f"option_{letter.lower()}"
                if col_name in row and row[col_name]:
                    db.add(QuestionOption(
                        question_id=q.id,
                        option_text=row[col_name],
                        is_correct=(letter in correct_opts),
                        order_index=ord(letter) - ord('A') + 1
                    ))
            db.commit()
            imported_count += 1

    return {"message": f"Successfully imported {imported_count} questions", "count": imported_count}
