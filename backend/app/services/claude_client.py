import json
import anthropic
from app.services.settings_store import get_settings

_client: anthropic.AsyncAnthropic | None = None
_client_config_key: str = ""


def _config_key(s: dict) -> str:
    return f"{s.get('api_key','')}:{s.get('base_url','')}"


def get_client() -> anthropic.AsyncAnthropic:
    global _client, _client_config_key
    s = get_settings()
    ck = _config_key(s)
    if _client is None or ck != _client_config_key:
        kwargs: dict = {"api_key": s.get("api_key", "")}
        base_url = s.get("base_url", "")
        if base_url:
            kwargs["base_url"] = base_url
        _client = anthropic.AsyncAnthropic(**kwargs)
        _client_config_key = ck
    return _client


VALUE_CHAIN_SYSTEM = """You are a supply chain expert. Given a product, generate a stylized upstream value chain.
Cover 4-6 segments from raw material extraction to final product manufacturing.
Each segment should reflect real-world supply chain stages with accurate key materials and major producing countries."""

HS_CODES_SYSTEM = """You are a trade classification expert specializing in the Harmonized System (HS-2022).
Given supply chain segments, assign the most relevant HS-6 digit codes for each segment.
Use real HS-2022 codes (6 digits, no dots). Include 1-4 codes per segment with a brief rationale."""

_VALUE_CHAIN_TOOL = {
    "name": "output_value_chain",
    "description": "Return the structured value chain for the given product",
    "input_schema": {
        "type": "object",
        "properties": {
            "segments": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "id": {"type": "integer"},
                        "name": {"type": "string"},
                        "description": {"type": "string"},
                        "key_materials": {"type": "array", "items": {"type": "string"}},
                        "major_producing_countries": {"type": "array", "items": {"type": "string"}},
                    },
                    "required": ["id", "name", "description", "key_materials", "major_producing_countries"],
                },
            }
        },
        "required": ["segments"],
    },
}

_HS_CODES_TOOL = {
    "name": "output_hs_assignments",
    "description": "Return HS code assignments for each supply chain segment",
    "input_schema": {
        "type": "object",
        "properties": {
            "assignments": {
                "type": "array",
                "items": {
                    "type": "object",
                    "properties": {
                        "segment_id": {"type": "integer"},
                        "segment_name": {"type": "string"},
                        "hs_codes": {"type": "array", "items": {"type": "string"}},
                        "rationale": {"type": "string"},
                    },
                    "required": ["segment_id", "segment_name", "hs_codes", "rationale"],
                },
            }
        },
        "required": ["assignments"],
    },
}


def _extract_tool_input(message: anthropic.types.Message, tool_name: str) -> dict:
    for block in message.content:
        if block.type == "tool_use" and block.name == tool_name:
            return block.input  # type: ignore[return-value]
    raise ValueError(f"Tool '{tool_name}' not called in response")


async def generate_value_chain(product: str) -> dict:
    client = get_client()
    model = get_settings().get("model", "claude-sonnet-4-6")
    user_prompt = f"Generate a stylized value chain for: {product}"

    message = await client.messages.create(
        model=model,
        max_tokens=2000,
        system=[{"type": "text", "text": VALUE_CHAIN_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
        tools=[_VALUE_CHAIN_TOOL],
        tool_choice={"type": "tool", "name": "output_value_chain"},
    )

    data = _extract_tool_input(message, "output_value_chain")
    token_count = message.usage.input_tokens + message.usage.output_tokens

    return {
        "segments": data["segments"],
        "prompt_used": f"System: {VALUE_CHAIN_SYSTEM}\n\nUser: {user_prompt}",
        "raw_llm_response": json.dumps(data, indent=2),
        "token_count": token_count,
    }


async def assign_hs_codes(product: str, segments: list) -> dict:
    client = get_client()
    model = get_settings().get("model", "claude-sonnet-4-6")
    user_prompt = f"Product: {product}\nSegments:\n{json.dumps(segments, indent=2)}"

    message = await client.messages.create(
        model=model,
        max_tokens=2000,
        system=[{"type": "text", "text": HS_CODES_SYSTEM, "cache_control": {"type": "ephemeral"}}],
        messages=[{"role": "user", "content": user_prompt}],
        tools=[_HS_CODES_TOOL],
        tool_choice={"type": "tool", "name": "output_hs_assignments"},
    )

    data = _extract_tool_input(message, "output_hs_assignments")

    return {
        "assignments": data["assignments"],
        "prompt_used": f"System: {HS_CODES_SYSTEM}\n\nUser: {user_prompt}",
        "raw_llm_response": json.dumps(data, indent=2),
    }
