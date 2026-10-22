# CloudExam Deployment & Operations Guide

## 1. Local Development (Instant Launch)
Prerequisites: Python 3.11+, Node.js 18+

### Backend Setup:
```bash
# In Project Root
cd backend
python -m venv venv
# On Windows:
venv\Scripts\pip install -r requirements.txt
venv\Scripts\python -m uvicorn backend.app.main:app --reload --port 8000
```
Backend API will be accessible at: `http://127.0.0.1:8000` (Swagger UI: `http://127.0.0.1:8000/docs`).

### Frontend Setup:
```bash
# In a separate terminal
cd frontend
npm install
npm run dev
```
Frontend will be accessible at: `http://localhost:5173`.

---

## 2. Docker & Containerized Orchestration
Run the entire platform with PostgreSQL 16, Redis 7, FastAPI backend, and Nginx React frontend:

```bash
docker-compose up --build -d
```
Service endpoints:
- Web Application: `http://localhost` (Port 80)
- Backend API & Swagger: `http://localhost:8000/docs`
- PostgreSQL: `localhost:5432` (Internal network isolation)
- Redis: `localhost:6379`

To inspect container health:
```bash
docker-compose ps
docker-compose logs -f backend
```

---

## 3. Database Backup & Disaster Recovery

### Creating a Backup:
```bash
# PostgreSQL Container Backup
docker exec -t cloudexam_db pg_dump -U cloudexam_user cloudexam > backup_$(date +%Y%m%d).sql
```

### Restoring from Backup:
```bash
# Restore into test or production database
cat backup_20261022.sql | docker exec -i cloudexam_db psql -U cloudexam_user -d cloudexam
```
