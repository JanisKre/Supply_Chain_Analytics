from fastapi import APIRouter
from pydantic import BaseModel
from typing import Optional
from app.services.settings_store import get_settings, update_settings

router = APIRouter()

ANTHROPIC_MODELS = [
    "claude-opus-4-7",
    "claude-sonnet-4-6",
    "claude-haiku-4-5-20251001",
]


class SettingsPatch(BaseModel):
    provider: Optional[str] = None
    api_key: Optional[str] = None
    base_url: Optional[str] = None
    model: Optional[str] = None


def _masked(s: dict) -> dict:
    key = s.get("api_key", "")
    return {
        "provider": s.get("provider", "proxy"),
        "api_key_masked": f"***{key[-4:]}" if len(key) > 4 else ("***" if key else ""),
        "has_api_key": bool(key),
        "base_url": s.get("base_url", ""),
        "model": s.get("model", "claude-sonnet-4-6"),
        "available_models": ANTHROPIC_MODELS,
    }


@router.get("/settings")
def read_settings():
    return _masked(get_settings())


@router.patch("/settings")
def write_settings(body: SettingsPatch):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    updated = update_settings(data)
    return _masked(updated)


@router.post("/settings/test")
async def test_connection():
    from app.services.claude_client import get_client
    s = get_settings()
    try:
        client = get_client()
        msg = await client.messages.create(
            model=s.get("model", "claude-sonnet-4-6"),
            max_tokens=10,
            messages=[{"role": "user", "content": "Say OK"}],
        )
        reply = msg.content[0].text if msg.content else ""
        return {"ok": True, "model": s.get("model"), "response": reply}
    except Exception as e:
        return {"ok": False, "error": str(e)}
