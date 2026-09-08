from __future__ import annotations

from contextlib import asynccontextmanager
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from app.api.routes import router
from app.config import get_settings
from app.logutil import configure_logging, get_logger
from app.state.db import create_schema, make_engine, ping, session_factory

configure_logging()
log = get_logger("main")
settings = get_settings()


def _init_db(app: FastAPI) -> None:
    app.state.engine = None
    app.state.db_session = None
    if not (settings.direct_url or settings.database_url):
        return
    try:
        if settings.database_url:
            engine = make_engine(settings.database_url, pooler=True)
        else:
            engine = make_engine(settings.direct_url, pooler=False)
        if settings.auto_create_schema and settings.direct_url:
            create_schema(make_engine(settings.direct_url, pooler=False))
        ping(engine)
        app.state.engine = engine
        app.state.db_session = session_factory(engine)
    except Exception as exc:
        log.info("db_init_deferred", extra={"error_class": type(exc).__name__, "phase": "OBSERVE"})
        app.state.engine = None
        app.state.db_session = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    _init_db(app)
    log.info("startup", extra={"phase": "OBSERVE", "state": "HALTED" if settings.kill_switch else "NORMAL"})
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
origins = [o.strip() for o in settings.cors_origin.split(",") if o.strip()]
if "*" not in origins:
    origins.append("*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://([a-z0-9-]+\.)?vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
app.include_router(router)


@app.middleware("http")
async def request_id_middleware(request: Request, call_next) -> Response:
    rid = request.headers.get("X-Request-Id") or str(uuid4())
    request.state.request_id = rid
    response = await call_next(request)
    response.headers["X-Request-Id"] = rid
    return response


if __name__ == "__main__":
    import os
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=int(os.environ.get("PORT", settings.port)),
    )
