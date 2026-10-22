from typing import List, Dict, Any, Tuple
from sqlalchemy.orm import Session
from backend.app.models.models import (
    ExamAttempt, AttemptAnswer, Question, QuestionOption, 
    QuestionType, AttemptStatus, Examination
)

def evaluate_objective_answer(
    question: Question,
    selected_option_ids: List[int],
    options: List[QuestionOption],
    negative_marking: bool = False,
    negative_mark_value: float = 0.25,
    partial_credit: bool = True
) -> Tuple[float, bool]:
    """
    Evaluates an objective answer.
    Returns: (marks_awarded, is_evaluated)
    """
    correct_option_ids = {opt.id for opt in options if opt.is_correct}
    selected_set = set(selected_option_ids)
    q_marks = float(question.marks)

    if question.question_type == QuestionType.MCQ_SINGLE or question.question_type == QuestionType.TRUE_FALSE:
        if not selected_set:
            return (0.0, True)
        
        # In single choice, check if selected matches the single correct ID
        if selected_set == correct_option_ids:
            return (q_marks, True)
        else:
            deduction = -abs(float(negative_mark_value)) if negative_marking else 0.0
            return (deduction, True)

    elif question.question_type == QuestionType.MCQ_MULTIPLE:
        if not selected_set:
            return (0.0, True)
        
        # Perfect match
        if selected_set == correct_option_ids:
            return (q_marks, True)
        
        if not partial_credit:
            deduction = -abs(float(negative_mark_value)) if negative_marking else 0.0
            return (deduction, True)
        
        # Configurable partial credit policy:
        # Score = (correctly selected items / total correct items) - (incorrectly selected items / total incorrect items)
        # Clamped to [0, q_marks]
        total_correct = len(correct_option_ids)
        if total_correct == 0:
            return (0.0, True)

        correctly_chosen = len(selected_set.intersection(correct_option_ids))
        incorrectly_chosen = len(selected_set - correct_option_ids)
        
        fraction = (correctly_chosen / total_correct) - (0.5 * incorrectly_chosen / total_correct)
        awarded = max(0.0, fraction * q_marks)
        return (round(awarded, 2), True)

    # Subjective questions cannot be automatically evaluated without human grading
    return (0.0, False)

def evaluate_attempt_objective_questions(db: Session, attempt: ExamAttempt) -> ExamAttempt:
    """
    Evaluates all objective questions for an attempt, updates score and status.
    """
    exam: Examination = attempt.examination
    answers: List[AttemptAnswer] = db.query(AttemptAnswer).filter(
        AttemptAnswer.attempt_id == attempt.id
    ).all()

    total_score = 0.0
    all_evaluated = True

    for ans in answers:
        q: Question = ans.question
        if q.question_type in [QuestionType.MCQ_SINGLE, QuestionType.MCQ_MULTIPLE, QuestionType.TRUE_FALSE]:
            options = db.query(QuestionOption).filter(QuestionOption.question_id == q.id).all()
            marks, is_eval = evaluate_objective_answer(
                question=q,
                selected_option_ids=ans.selected_option_ids or [],
                options=options,
                negative_marking=exam.negative_marking,
                negative_mark_value=exam.negative_mark_value,
                partial_credit=exam.partial_credit
            )
            ans.marks_awarded = marks
            ans.is_evaluated = is_eval
            total_score += marks
        else:
            # Subjective question (SHORT_ANSWER or ESSAY)
            if not ans.is_evaluated:
                all_evaluated = False
            else:
                total_score += float(ans.marks_awarded or 0.0)

    attempt.score_obtained = max(0.0, round(total_score, 2))
    total_possible = float(exam.total_marks or 1.0)
    attempt.percentage = round((attempt.score_obtained / total_possible) * 100.0, 2)
    attempt.passed = attempt.score_obtained >= float(exam.passing_marks)

    if all_evaluated:
        attempt.status = AttemptStatus.EVALUATED
    else:
        attempt.status = AttemptStatus.SUBMITTED

    db.commit()
    db.refresh(attempt)
    return attempt
