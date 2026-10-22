# CloudExam Database Design & Schema Specification

## 1. Relational Entity Overview
The database layer is constructed with SQLAlchemy ORM and Alembic migrations supporting PostgreSQL with an SQLite local development fallback.

### Entities
1. **`users`**:
   - `id` (PK, Integer)
   - `email` (Unique, Index, String 255)
   - `username` (Unique, Index, String 100)
   - `full_name` (String 255)
   - `hashed_password` (Bcrypt hash)
   - `role` (Enum: `ADMIN`, `TEACHER`, `STUDENT`)
   - `is_active` (Boolean)
   - `created_at`, `updated_at` (UTC DateTime)

2. **`courses`**:
   - `id` (PK, Integer)
   - `code` (Unique, Index, String 50)
   - `name` (String 255)
   - `academic_term` (String 50)
   - `teacher_id` (FK to `users.id`)
   - `status` (`ACTIVE`, `ARCHIVED`)

3. **`enrollments`**:
   - `id` (PK)
   - `course_id` (FK to `courses.id`, OnDelete CASCADE)
   - `student_id` (FK to `users.id`, OnDelete CASCADE)
   - `UniqueConstraint("course_id", "student_id")`

4. **`questions`**:
   - `id` (PK)
   - `teacher_id` (FK to `users.id`)
   - `subject_id` (FK to `subjects.id`, Optional)
   - `course_id` (FK to `courses.id`, Optional)
   - `topic` (String)
   - `difficulty` (`EASY`, `MEDIUM`, `HARD`)
   - `question_type` (`MCQ_SINGLE`, `MCQ_MULTIPLE`, `TRUE_FALSE`, `SHORT_ANSWER`, `ESSAY`)
   - `question_text` (Text)
   - `marks` (Float)
   - `model_answer` (Text, Optional)
   - `explanation` (Text, Optional)

5. **`question_options`**:
   - `id` (PK)
   - `question_id` (FK to `questions.id`, OnDelete CASCADE)
   - `option_text` (Text)
   - `is_correct` (Boolean)
   - `order_index` (Integer)

6. **`examinations`**:
   - `id` (PK)
   - `title`, `description`
   - `course_id` (FK to `courses.id`)
   - `teacher_id` (FK to `users.id`)
   - `start_time`, `end_time` (UTC DateTime)
   - `duration_minutes` (Integer)
   - `total_marks`, `passing_marks` (Float)
   - `negative_marking` (Boolean), `negative_mark_value` (Float)
   - `partial_credit` (Boolean)
   - `is_published`, `results_published` (Boolean)

7. **`exam_attempts`**:
   - `id` (PK)
   - `exam_id` (FK to `examinations.id`)
   - `student_id` (FK to `users.id`)
   - `attempt_number` (Integer)
   - `status` (`IN_PROGRESS`, `SUBMITTED`, `EVALUATED`, `EXPIRED`)
   - `started_at`, `deadline`, `submitted_at` (UTC DateTime)
   - `score_obtained`, `percentage` (Float)
   - `passed` (Boolean)
   - `UniqueConstraint("exam_id", "student_id", "attempt_number")`

8. **`attempt_answers`**:
   - `id` (PK)
   - `attempt_id` (FK to `exam_attempts.id`, OnDelete CASCADE)
   - `question_id` (FK to `questions.id`)
   - `selected_option_ids` (JSON array of integer option IDs)
   - `text_response` (Text)
   - `is_marked_for_review` (Boolean)
   - `marks_awarded` (Float)
   - `is_evaluated` (Boolean)
   - `UniqueConstraint("attempt_id", "question_id")`

9. **`audit_logs`**:
   - `id` (PK)
   - `user_id` (FK to `users.id`, OnDelete SET NULL)
   - `action` (String 100, Indexed)
   - `resource_type` (String 100)
   - `resource_id` (String 100)
   - `details` (JSON)
   - `created_at` (UTC DateTime)
