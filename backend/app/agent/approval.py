from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from app.core.schemas import Approval, Decision


def issue_approval(decision: Decision, *, ttl_s: int = 30) -> Approval:
    now = datetime.now(timezone.utc)
    expires = now + timedelta(seconds=ttl_s)
    decision_id = hashlib.sha256(
        f"{decision.intent.raw_text}:{decision.capacity.snapshot_hash}:{decision.action.value}".encode()
    ).hexdigest()[:16]
    token = secrets.token_urlsafe(16)
    return Approval(
        approval_id=hashlib.sha256(token.encode()).hexdigest()[:16],
        decision_id=decision_id,
        snapshot_hash=decision.capacity.snapshot_hash,
        expires_at=expires,
        confirmation_token=token,
        status="PENDING",
    )


def validate_approval(
    approval: Approval,
    *,
    snapshot_hash: str,
    now: datetime | None = None,
    confirm_text: str,
    writes_enabled: bool,
) -> str | None:
    """Return error class or None if OK."""
    now = now or datetime.now(timezone.utc)
    if confirm_text.strip() != "CONFIRM":
        return "CONFIRM_REQUIRED"
    if not writes_enabled:
        return "WRITES_DISABLED"
    if approval.status != "PENDING":
        return "APPROVAL_NOT_PENDING"
    if now > approval.expires_at:
        return "APPROVAL_EXPIRED"
    if approval.snapshot_hash != snapshot_hash:
        return "SNAPSHOT_MISMATCH"
    return None
