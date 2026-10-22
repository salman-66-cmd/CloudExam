# CloudExam Testing & Verification Guide

## 1. Automated Test Suite (Pytest)
CloudExam includes a comprehensive automated test suite covering authentication, role-based authorization, enrollment constraints, question bank security, autosave idempotency, and the complete 14-step teacher-to-student end-to-end examination lifecycle.

### Running Pytest:
```bash
# In Project Root with active virtualenv
python -m pytest backend/tests -v
```

### Verified Test Cases:
1. `test_health_and_system`: Verifies API cluster health and database connectivity.
2. `test_login_flow`: Tests Admin, Teacher, and Student login with token validation and bad password rejection.
3. `test_role_based_access_control`: Verifies student rejection on admin audit logs and privileged endpoints.
4. `test_question_bank_security`: Verifies that students cannot retrieve question banks or answer keys.
5. `test_complete_examination_lifecycle_e2e`:
   - Teacher creates course.
   - Teacher authors question with options.
   - Teacher creates & schedules exam.
   - Teacher enrolls student.
   - Teacher publishes exam.
   - Student attempts exam.
   - Student saves answers via autosave.
   - Student submits exam.
   - Objective questions auto-evaluated.
   - Student blocked from viewing results before publication.
   - Teacher publishes results.
   - Student views verified score and itemized breakdown.
6. `test_submission_idempotency`: Verifies that repeated submission calls do not create duplicate grades or attempts.

---

## 2. Concurrency & Load Testing
A synthetic load testing script (`scripts/load_test_concurrency.py`) is provided to verify concurrent candidate attempts:

```bash
# Ensure backend is running, then run:
python scripts/load_test_concurrency.py
```
This simulates 15 simultaneous examinees logging in, loading active question papers, sending concurrent autosave requests, and submitting.
