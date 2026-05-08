import pytest
from unittest.mock import MagicMock, AsyncMock, patch

from app.services.claude_client import _extract_tool_input, generate_value_chain, assign_hs_codes


# ── _extract_tool_input ───────────────────────────────────────────────────────

def _make_tool_block(name: str, input_data: dict):
    block = MagicMock()
    block.type = "tool_use"
    block.name = name
    block.input = input_data
    return block


def test_extract_tool_input_found():
    msg = MagicMock()
    msg.content = [_make_tool_block("output_value_chain", {"segments": []})]
    result = _extract_tool_input(msg, "output_value_chain")
    assert result == {"segments": []}


def test_extract_tool_input_not_found_raises():
    msg = MagicMock()
    msg.content = [_make_tool_block("other_tool", {})]
    with pytest.raises(ValueError, match="output_value_chain"):
        _extract_tool_input(msg, "output_value_chain")


def test_extract_tool_input_skips_non_tool_blocks():
    text_block = MagicMock()
    text_block.type = "text"
    tool_block = _make_tool_block("output_value_chain", {"segments": [{"id": 1}]})
    msg = MagicMock()
    msg.content = [text_block, tool_block]
    result = _extract_tool_input(msg, "output_value_chain")
    assert result["segments"][0]["id"] == 1


# ── generate_value_chain ──────────────────────────────────────────────────────

def _mock_message(tool_name: str, input_data: dict):
    msg = MagicMock()
    msg.content = [_make_tool_block(tool_name, input_data)]
    msg.usage.input_tokens = 100
    msg.usage.output_tokens = 50
    return msg


async def test_generate_value_chain_returns_segments():
    segments_data = [
        {"id": 1, "name": "Mining", "description": "Raw extraction", "key_materials": ["REE"], "major_producing_countries": ["CHN"]},
        {"id": 2, "name": "Processing", "description": "Refinement", "key_materials": ["NdFeB"], "major_producing_countries": ["CHN", "DEU"]},
    ]
    mock_msg = _mock_message("output_value_chain", {"segments": segments_data})

    with patch("app.services.claude_client.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_get_client.return_value = mock_client

        result = await generate_value_chain("NdFeB permanent magnets")

    assert len(result["segments"]) == 2
    assert result["segments"][0]["name"] == "Mining"
    assert "prompt_used" in result
    assert "raw_llm_response" in result
    assert result["token_count"] == 150


async def test_generate_value_chain_includes_product_in_prompt():
    mock_msg = _mock_message("output_value_chain", {"segments": []})

    with patch("app.services.claude_client.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_get_client.return_value = mock_client

        result = await generate_value_chain("lithium batteries")

    assert "lithium batteries" in result["prompt_used"]


# ── assign_hs_codes ───────────────────────────────────────────────────────────

async def test_assign_hs_codes_returns_assignments():
    assignments_data = [
        {"segment_id": 1, "segment_name": "Mining", "hs_codes": ["260121"], "rationale": "Iron ores"},
    ]
    mock_msg = _mock_message("output_hs_assignments", {"assignments": assignments_data})

    with patch("app.services.claude_client.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_get_client.return_value = mock_client

        result = await assign_hs_codes("NdFeB magnets", [{"id": 1, "name": "Mining"}])

    assert len(result["assignments"]) == 1
    assert result["assignments"][0]["hs_codes"] == ["260121"]


async def test_assign_hs_codes_uses_tool_choice():
    mock_msg = _mock_message("output_hs_assignments", {"assignments": []})

    with patch("app.services.claude_client.get_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_client.messages.create = AsyncMock(return_value=mock_msg)
        mock_get_client.return_value = mock_client

        await assign_hs_codes("product", [])

    call_kwargs = mock_client.messages.create.call_args.kwargs
    assert call_kwargs["tool_choice"] == {"type": "tool", "name": "output_hs_assignments"}
    assert any(s.get("cache_control") for s in call_kwargs["system"])
