from __future__ import annotations

from pathlib import Path

import pytest
from dotenv import dotenv_values
from sqlalchemy import text

from alembic import command
from alembic.config import Config
from app.state.db import make_engine, normalize_dsn


SCHEMA = "plimsoll_alembic_pytest"


def test_alembic_upgrade_downgrade_upgrade():
    env_path = Path(__file__).resolve().parents[2] / ".env"
    url = (dotenv_values(env_path).get("DIRECT_URL") or "").strip()
    if not url:
        pytest.skip("DIRECT_URL not available")
    root = make_engine(url, pooler=False)
    with root.connect() as conn:
        conn.execute(text(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"))
        conn.execute(text(f"CREATE SCHEMA {SCHEMA}"))
        conn.commit()
    cfg = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    cfg.set_main_option("sqlalchemy.url", normalize_dsn(url, pooler=False))
    cfg.set_main_option("script_location", str(Path(__file__).resolve().parents[1] / "alembic"))

    class _Opts:
        x = [f"schema={SCHEMA}"]

    cfg.cmd_opts = _Opts()
    try:
        command.upgrade(cfg, "head")
        command.downgrade(cfg, "base")
        command.upgrade(cfg, "head")
    finally:
        with root.connect() as conn:
            conn.execute(text(f"DROP SCHEMA IF EXISTS {SCHEMA} CASCADE"))
            conn.commit()
        root.dispose()
