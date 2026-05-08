import json
import os
from pathlib import Path

_SETTINGS_FILE: Path | None = None
_current: dict | None = None


def _settings_file() -> Path:
    global _SETTINGS_FILE
    if _SETTINGS_FILE is None:
        from app.config import settings as app_settings
        _SETTINGS_FILE = Path(app_settings.data_dir) / "llm_settings.json"
    return _SETTINGS_FILE


def _default() -> dict:
    from app.config import settings as app_settings
    has_proxy = bool(os.environ.get("ANTHROPIC_BASE_URL") or app_settings.anthropic_base_url)
    return {
        "provider": "proxy" if has_proxy else "anthropic",
        "api_key": os.environ.get("ANTHROPIC_AUTH_TOKEN") or app_settings.anthropic_api_key,
        "base_url": os.environ.get("ANTHROPIC_BASE_URL") or app_settings.anthropic_base_url,
        "model": "claude-sonnet-4-6",
    }


def get_settings() -> dict:
    global _current
    if _current is not None:
        return _current
    f = _settings_file()
    if f.exists():
        try:
            _current = json.loads(f.read_text())
            return _current
        except Exception:
            pass
    _current = _default()
    return _current


def update_settings(data: dict) -> dict:
    global _current
    current = dict(get_settings())
    if "provider" in data:
        current["provider"] = data["provider"]
    if "api_key" in data and data["api_key"] and not data["api_key"].startswith("***"):
        current["api_key"] = data["api_key"]
    if "base_url" in data:
        current["base_url"] = data["base_url"]
    if "model" in data:
        current["model"] = data["model"]
    _current = current
    try:
        _settings_file().write_text(json.dumps(current, indent=2))
    except Exception:
        pass
    return current
