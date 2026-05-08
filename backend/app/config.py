import os
from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    # Falls ANTHROPIC_AUTH_TOKEN gesetzt ist (Hyperspace-Proxy), wird es als API-Key genutzt.
    # Fallback: ANTHROPIC_API_KEY aus .env
    anthropic_api_key: str = ""
    anthropic_base_url: str = ""
    temp_dir: str = "/tmp"
    data_dir: str = str(Path(__file__).parent / "data")
    allowed_origins: str = "http://localhost:3000,http://frontend:3000"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @property
    def effective_api_key(self) -> str:
        return os.environ.get("ANTHROPIC_AUTH_TOKEN") or self.anthropic_api_key

    @property
    def effective_base_url(self) -> str:
        return os.environ.get("ANTHROPIC_BASE_URL") or self.anthropic_base_url


settings = Settings()
