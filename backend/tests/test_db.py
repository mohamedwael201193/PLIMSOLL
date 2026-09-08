from __future__ import annotations

from pathlib import Path
from uuid import uuid4

import pytest
from dotenv import dotenv_values
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.state.db import create_schema, make_engine, ping, session_factory
from app.state.ledger import record_fill
from app.state.models import Base, DecisionRow, IntentRow
from app.state.snapshots import persist_snapshot
from tests.conftest import snapshot
from app.core.schemas import FillReport
from decimal import Decimal


SCHEMA = "plimsoll_pytest"


def _direct_url() -> str:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    vals = dotenv_values(env_path)
    url = (vals.get("DIRECT_URL") or "").strip()
    if not url:
        pytest.skip("DIRECT_URL not available")
    return url


@pytest.fixture(scope="module")
def engine():
    url = _direct_url()
    root = make_engine(url, pooler=False)
    with root.connect() as conn:
        conn.execute(text(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"))
        conn.execute(text(f"CREATE SCHEMA {SCHEMA}"))
        conn.commit()
    from sqlalchemy import create_engine

    from app.state.db import normalize_dsn

    eng = create_engine(
        normalize_dsn(url, pooler=False),
        pool_pre_ping=True,
        connect_args={"options": f"-csearch_path={SCHEMA}"},
    )
    yield eng
    with root.connect() as conn:
        conn.execute(text(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"))
        conn.commit()
    root.dispose()
    eng.dispose()


def test_ping(engine):
    assert ping(engine) is True


def test_migrate_up_down_reinstall(engine):
    create_schema(engine)
    names = set(Base.metadata.tables)
    assert "snapshots" in names
    assert "fills" in names
    Base.metadata.drop_all(engine)
    create_schema(engine)
    Base.metadata.drop_all(engine)
    create_schema(engine)


def test_snapshot_roundtrip_and_unique_hash(engine):
    create_schema(engine)
    Session = session_factory(engine)
    snap = snapshot()
    sess = Session()
    try:
        row = persist_snapshot(sess, snap)
        assert row is not None
        again = persist_snapshot(sess, snap)
        assert again is None
    finally:
        sess.close()


def test_fill_idempotency_unique_client_order_id(engine):
    create_schema(engine)
    Session = session_factory(engine)
    sess = Session()
    fill = FillReport(
        classification="REPLAY",
        client_order_id="plim_dup_test",
        status="FILLED",
        executed_qty=Decimal("1"),
        cummulative_quote_qty=Decimal("1"),
    )
    try:
        _, first = record_fill(sess, fill, {"status": "FILLED"})
        _, second = record_fill(sess, fill, {"status": "FILLED"})
        assert first is True
        assert second is False
    finally:
        sess.close()


def test_foreign_keys(engine):
    create_schema(engine)
    Session = session_factory(engine)
    sess = Session()
    try:
        intent = IntentRow(raw_text="buy", parsed={"symbol": "ARKUSDT"})
        sess.add(intent)
        sess.commit()
        sess.refresh(intent)
        dec = DecisionRow(
            intent_id=intent.id,
            capacity={"estimated_exit_capacity_notional": "0"},
            action="ASK",
            binding="ZERO",
        )
        sess.add(dec)
        sess.commit()
        bad = DecisionRow(
            intent_id=str(uuid4()),
            capacity={},
            action="ASK",
            binding="ZERO",
        )
        sess.add(bad)
        with pytest.raises(IntegrityError):
            sess.commit()
        sess.rollback()
    finally:
        sess.close()
