from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.config import get_settings
from app.state.db import normalize_dsn
from app.state.models import Base

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    ini = config.get_main_option("sqlalchemy.url")
    if ini and not ini.startswith("driver://"):
        return ini
    settings = get_settings()
    url = settings.direct_url or settings.database_url
    if not url:
        raise RuntimeError("DIRECT_URL is required for migrations")
    return url


def connect_args() -> dict:
    x = {}
    try:
        x = context.get_x_argument(as_dictionary=True)
    except Exception:
        x = {}
    schema = x.get("schema")
    if schema:
        return {"options": f"-csearch_path={schema}"}
    return {}


def run_migrations_offline() -> None:
    context.configure(
        url=get_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(
        normalize_dsn(get_url(), pooler=False),
        pool_pre_ping=True,
        connect_args=connect_args(),
        poolclass=pool.NullPool,
    )
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
