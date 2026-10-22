# CloudExam Architecture Specification

## 1. System Overview
CloudExam is an enterprise-grade cloud-native smart examination and academic evaluation platform engineered to demonstrate core cloud computing principles:
- **Stateless Application Tier**: FastAPI backend running with asynchronous ASGI workers, designed for horizontal scale-out behind an ingress load balancer.
- **Centralized Relational Storage**: PostgreSQL cluster managing relational integrity, unique constraints on exam attempts, foreign keys, and transaction-safe grading updates.
- **Authoritative Server Time**: Examination countdown timers, access windows, and deadlines are authoritatively computed on the server using UTC timestamps to prevent client-side clock tampering.
- **Dual-Layer Auto Evaluation Engine**: Immediate vectorized grading of single/multiple choice and true-false objective items, paired with structured rubric grading workflows for subjective descriptive essays.

## 2. Component Topology
```mermaid
graph TD
    Client["Student / Teacher / Admin Browser (React 18 SPA)"]
    Nginx["Nginx Reverse Proxy / Static Edge (Port 80)"]
    FastAPI["FastAPI Stateless REST API Engine (Port 8000)"]
    Postgres[("Centralized PostgreSQL Database (Port 5432)")]
    Redis[("Redis In-Memory Cache & Session Store (Port 6379)")]

    Client -->|HTTPS / REST API| Nginx
    Nginx -->|Static Assets| Client
    Nginx -->|/api/v1 Reverse Proxy| FastAPI
    FastAPI -->|SQLAlchemy ORM Connection Pool| Postgres
    FastAPI -->|Short-lived Caching & Rate Limiting| Redis
```

## 3. Examination Lifecycle Workflow
```mermaid
sequenceDiagram
    autonumber
    actor Teacher as Teacher
    actor Student as Student
    participant API as FastAPI Backend
    participant DB as Relational Database

    Teacher->>API: POST /api/v1/exams (Draft & Schedule)
    Teacher->>API: POST /api/v1/exams/{id}/publish
    API->>DB: Set is_published=True & Dispatch Notifications
    Student->>API: POST /api/v1/attempts/exams/{id}/attempts
    API->>DB: Check schedule, verify enrollment, enforce deadline
    DB-->>Student: Return active attempt token & sanitized questions
    loop Every 20s or on navigation
        Student->>API: PUT /api/v1/attempts/{id}/answers/{qid} (Autosave)
        API->>DB: Persist latest answer & update saved timestamp
    end
    Student->>API: POST /api/v1/attempts/{id}/submit
    API->>DB: Record server submission timestamp
    API->>API: Grade objective questions (MCQ / TrueFalse)
    Teacher->>API: GET /api/v1/evaluations/pending
    Teacher->>API: POST /api/v1/evaluations/{id}/finalize
    Teacher->>API: POST /api/v1/exams/{id}/publish-results
    Student->>API: GET /api/v1/attempts/{id}/result (View Verified Marks)
```
