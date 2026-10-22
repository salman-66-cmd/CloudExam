# CloudExam API Reference Guide

All API endpoints are prefixed with `/api/v1` and return JSON responses. Interactive Swagger UI is available at `/docs` and ReDoc at `/redoc`.

## Authentication & Session
- `POST /api/v1/auth/login`: Authenticate with username/email & password. Returns JWT Bearer token and user payload.
- `POST /api/v1/auth/register`: Candidate self-registration.
- `GET /api/v1/auth/me`: Retrieve current user profile.
- `POST /api/v1/auth/logout`: Invalidate session and audit logout.

## Course & Enrollment
- `GET /api/v1/courses/`: List accessible courses.
- `POST /api/v1/courses/`: Create a new academic course.
- `POST /api/v1/courses/{id}/enrollments`: Enroll student into course.
- `GET /api/v1/courses/{id}/students`: List enrolled students.

## Question Bank
- `GET /api/v1/questions/`: Filter questions by topic, difficulty, or type (Teacher/Admin only).
- `POST /api/v1/questions/`: Author question with options and grading guide.
- `POST /api/v1/questions/import`: Bulk import questions from CSV or JSON.

## Examinations & Scheduling
- `GET /api/v1/exams/`: List examinations (Sanitized according to user role).
- `POST /api/v1/exams/`: Schedule an examination.
- `POST /api/v1/exams/{id}/publish`: Publish exam to enrolled students.
- `POST /api/v1/exams/{id}/publish-results`: Publish graded exam results.

## Online Examination Engine
- `POST /api/v1/attempts/exams/{id}/attempts`: Initialize or resume an active exam attempt.
- `GET /api/v1/attempts/{attempt_id}`: Fetch authoritative remaining seconds, questions, and saved answers.
- `PUT /api/v1/attempts/{attempt_id}/answers/{question_id}`: Autosave answer state.
- `POST /api/v1/attempts/{attempt_id}/submit`: Authoritative submission and automated grading.
- `GET /api/v1/attempts/{attempt_id}/result`: View detailed student grade and explanation (Only after results published).

## Teacher Evaluation
- `GET /api/v1/evaluations/pending`: Submissions requiring teacher essay evaluation.
- `POST /api/v1/evaluations/{attempt_id}/finalize`: Grade subjective questions and finalize total score.
