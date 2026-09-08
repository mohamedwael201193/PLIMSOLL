from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "PLIMSOLL"
    node_env: str = "development"
    port: int = 10000
    cors_origin: str = "*"
    database_url: str = ""
    direct_url: str = ""
    binance_rest_base: str = "https://api.binance.com"
    binance_rest_fallback: str = "https://data-api.binance.vision"
    binance_mcp_url: str = "https://agent.binance.com/mcp/agentic"
    binance_ws_base: str = "wss://stream.binance.com:9443"
    writes_enabled: bool = False
    kill_switch: bool = False
    auto_create_schema: bool = False
    binance_mcp_access_token: str = Field(default="", repr=False)
    http_timeout_s: float = 8.0
    stale_timeout_ms: int = 5000
    resolve_interval_s: int = 15


@lru_cache
def get_settings() -> Settings:
    return Settings()
