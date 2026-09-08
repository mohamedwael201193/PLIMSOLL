from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session, sessionmaker

from app.logutil import get_logger
from app.state.models import Base

log = get_logger("db")


def normalize_dsn(url: str, *, pooler: bool) -> str:
    raw = url.strip()
    if raw.startswith("postgres://"):
        raw = "postgresql://" + raw[len("postgres://") :]
    if raw.startswith("postgresql://") and "+psycopg" not in raw:
        raw = raw.replace("postgresql://", "postgresql+psycopg://", 1)
    parsed = urlparse(raw)
    q = dict(parse_qsl(parsed.query, keep_blank_values=True))
    q.pop("pgbouncer", None)
    new_q = urlencode(q)
    return urlunparse(parsed._replace(query=new_q))


def make_engine(url: str, *, pooler: bool) -> Engine:
    dsn = normalize_dsn(url, pooler=pooler)
    connect_args = {}
    if pooler:
        connect_args["prepare_threshold"] = None
    engine = create_engine(dsn, pool_pre_ping=True, connect_args=connect_args)
    return engine


def ping(engine: Engine) -> bool:
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    log.info("db_ping_ok", extra={"phase": "OBSERVE"})
    return True


def create_schema(engine: Engine) -> None:
    Base.metadata.create_all(engine)


def session_factory(engine: Engine) -> sessionmaker[Session]:
    return sessionmaker(bind=engine, expire_on_commit=False)
