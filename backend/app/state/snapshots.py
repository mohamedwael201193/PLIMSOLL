from __future__ import annotations

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.schemas import MarketSnapshot
from app.state.models import SnapshotRow


def persist_snapshot(session: Session, snap: MarketSnapshot) -> SnapshotRow | None:
    row = SnapshotRow(
        captured_at=snap.captured_at,
        symbol=snap.symbol,
        classification=snap.classification,
        depth={
            "bids": [[str(l.price), str(l.quantity)] for l in snap.bids],
            "asks": [[str(l.price), str(l.quantity)] for l in snap.asks],
        },
        ticker={"quoteVolume": str(snap.quote_volume_24h), "lastPrice": str(snap.last_price)},
        exchange_info=snap.filters.model_dump(mode="json"),
        hash=snap.snapshot_hash,
    )
    session.add(row)
    try:
        session.commit()
        session.refresh(row)
        return row
    except IntegrityError:
        session.rollback()
        return None
