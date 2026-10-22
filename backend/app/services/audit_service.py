from sqlalchemy.orm import Session
from typing import Optional, Any
from backend.app.models.models import AuditLog

def log_audit_event(
    db: Session,
    action: str,
    resource_type: str,
    user_id: Optional[int] = None,
    resource_id: Optional[str] = None,
    details: Optional[Any] = None,
    ip_address: Optional[str] = None
) -> AuditLog:
    # Sanitize details to never log passwords or secret tokens
    clean_details = None
    if isinstance(details, dict):
        clean_details = {k: ("***" if "password" in k.lower() or "token" in k.lower() else v) for k, v in details.items()}
    elif details is not None:
        clean_details = {"info": str(details)}
        
    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        resource_type=resource_type,
        resource_id=str(resource_id) if resource_id is not None else None,
        details=clean_details,
        ip_address=ip_address
    )
    db.add(audit_entry)
    db.commit()
    db.refresh(audit_entry)
    return audit_entry
