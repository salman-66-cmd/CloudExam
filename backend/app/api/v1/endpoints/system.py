from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List
from backend.app.core.database import get_db
from backend.app.models.models import SystemSetting, User
from backend.app.api.deps import get_current_admin

router = APIRouter()

@router.get("/health")
def health_check(db: Session = Depends(get_db)):
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "CloudExam Backend API",
        "version": "1.0.0",
        "database": db_status
    }

@router.get("/ready")
def readiness_check(db: Session = Depends(get_db)):
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception as e:
        raise HTTPException(status_code=503, detail="Database connection failed")

@router.get("/settings")
def get_system_settings(
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    settings = db.query(SystemSetting).all()
    return [{"key": s.key, "value": s.value, "description": s.description} for s in settings]

@router.post("/settings")
def update_system_setting(
    payload: Dict[str, str],
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    key = payload.get("key")
    val = payload.get("value")
    if not key or val is None:
        raise HTTPException(status_code=400, detail="Key and value are required")

    setting = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if not setting:
        setting = SystemSetting(key=key, value=val, description=payload.get("description", ""))
        db.add(setting)
    else:
        setting.value = val
    db.commit()
    return {"message": f"Setting {key} updated successfully"}
