import pytest
import pandas as pd
from unittest.mock import patch

from app.services.sankey_builder import build_sankey


SAMPLE_DF = pd.DataFrame([
    {"exporter_name": "China", "exporter_iso3": "CHN", "importer_name": "Germany",
     "importer_iso3": "DEU", "segment_name": "Mining", "v": 600.0},
    {"exporter_name": "Australia", "exporter_iso3": "AUS", "importer_name": "Germany",
     "importer_iso3": "DEU", "segment_name": "Mining", "v": 400.0},
    {"exporter_name": "China", "exporter_iso3": "CHN", "importer_name": "Japan",
     "importer_iso3": "JPN", "segment_name": "Refining", "v": 300.0},
    {"exporter_name": "Australia", "exporter_iso3": "AUS", "importer_name": "Japan",
     "importer_iso3": "JPN", "segment_name": "Refining", "v": 100.0},
])


def _patched_build(df=SAMPLE_DF, threshold=0.0):
    with (
        patch("app.services.sankey_builder.pd.read_parquet", return_value=df),
        patch("app.services.sankey_builder.settings.temp_dir", "/tmp"),
    ):
        return build_sankey("test123", threshold_pct=threshold)


def test_build_sankey_returns_correct_keys():
    result = _patched_build()
    assert set(result.keys()) == {"nodes", "links", "total_trade_value"}


def test_build_sankey_total_trade_value():
    result = _patched_build()
    assert result["total_trade_value"] == pytest.approx(1400.0)


def test_build_sankey_nodes_are_unique():
    result = _patched_build()
    assert len(result["nodes"]) == len(set(result["nodes"]))


def test_build_sankey_links_have_valid_indices():
    result = _patched_build()
    n = len(result["nodes"])
    for link in result["links"]:
        assert 0 <= link["source"] < n
        assert 0 <= link["target"] < n
        assert link["value"] > 0


def test_build_sankey_links_have_vcs_segment():
    result = _patched_build()
    for link in result["links"]:
        assert "vcs_segment" in link


def test_build_sankey_threshold_filters_small_flows():
    result_no_threshold = _patched_build(threshold=0.0)
    result_high_threshold = _patched_build(threshold=30.0)
    assert len(result_high_threshold["links"]) < len(result_no_threshold["links"])


def test_build_sankey_empty_after_threshold():
    result = _patched_build(threshold=99.0)
    assert result["nodes"] == []
    assert result["links"] == []


def test_build_sankey_empty_dataframe():
    empty = pd.DataFrame(columns=["exporter_name", "exporter_iso3", "importer_name", "importer_iso3", "segment_name", "v"])
    result = _patched_build(df=empty)
    assert result == {"nodes": [], "links": [], "total_trade_value": 0.0}


def test_build_sankey_zero_value_rows_excluded():
    df_with_zeros = SAMPLE_DF.copy()
    df_with_zeros = pd.concat([
        df_with_zeros,
        pd.DataFrame([{"exporter_name": "Brazil", "exporter_iso3": "BRA", "importer_name": "France",
                       "importer_iso3": "FRA", "segment_name": "Mining", "v": 0.0}])
    ], ignore_index=True)
    result = _patched_build(df=df_with_zeros)
    node_names = result["nodes"]
    assert "Brazil" not in node_names


def test_build_sankey_missing_names_fallback_to_iso():
    df = pd.DataFrame([{
        "exporter_name": None, "exporter_iso3": "CHN",
        "importer_name": None, "importer_iso3": "DEU",
        "segment_name": "Mining", "v": 500.0,
    }])
    result = _patched_build(df=df)
    assert "CHN" in result["nodes"]
    assert "DEU" in result["nodes"]
