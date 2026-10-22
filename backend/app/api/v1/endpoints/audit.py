from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from backend.app.core.database import get_db
from backend.app.models.models import AuditLog, User
from backend.app.schemas.schemas import AuditLogResponse
from backend.app.api.deps import get_current_admin

router = APIRouter()

@router.get("/", response_model=List[AuditLogResponse])
def list_audit_logs(
    action: Optional[str] = None,
    resource_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    query = db.query(AuditLog)
    if action:
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))
    if resource_type:
        query = query.filter(AuditLog.resource_type.ilike(f"%{resource_type}%"))

    logs = query.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit).all()
    results = []
    for l in logs:
        results.append(
            AuditLogResponse(
                id=l.id,
                user_id=l.user_id,
                user_name=l.user.full_name if l.user else "System",
                action=l.action,
                resource_type=l.resource_type,
                resource_id=l.resource_id,
                details=l.details,
                ip_address=l.ip_address,
                created_at=l.created_at
            )
        )
    return results
