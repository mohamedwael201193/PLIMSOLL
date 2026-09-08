from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.schemas import FillReport
from app.state.models import AuditRow, FillRow


def record_fill(session: Session, fill: FillReport, raw: dict) -> tuple[FillRow | None, bool]:
    """Insert fill. Returns (row, inserted). Duplicate client_order_id is not a second fill."""
    row = FillRow(
        client_order_id=fill.client_order_id,
        order_id=fill.order_id,
        executed_qty=float(fill.executed_qty),
        cumm_quote=float(fill.cummulative_quote_qty),
        status=fill.status,
        raw={k: raw.get(k) for k in list(raw)[:40]} if isinstance(raw, dict) else {},
    )
    session.add(row)
    try:
        session.commit()
        session.refresh(row)
        return row, True
    except IntegrityError:
        session.rollback()
        return None, False


def audit(session: Session, kind: str, payload: dict) -> None:
    session.add(AuditRow(kind=kind, payload=payload))
    session.commit()
