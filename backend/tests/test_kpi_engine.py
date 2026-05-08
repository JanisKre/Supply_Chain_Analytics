import pytest
import pandas as pd
from unittest.mock import AsyncMock, patch

from app.services.kpi_engine import (
    _compute_hhi,
    _score_country,
    _build_path_analysis,
    _build_betweenness,
    compute_kpis,
)


# ── _compute_hhi ──────────────────────────────────────────────────────────────

def test_compute_hhi_monopoly():
    df = pd.DataFrame({"exporter_iso3": ["CHN", "CHN", "CHN"], "v": [100.0, 200.0, 300.0]})
    assert _compute_hhi(df) == pytest.approx(10000.0)


def test_compute_hhi_duopoly_equal():
    df = pd.DataFrame({"exporter_iso3": ["CHN", "DEU"], "v": [500.0, 500.0]})
    assert _compute_hhi(df) == pytest.approx(5000.0)


def test_compute_hhi_empty_returns_zero():
    df = pd.DataFrame({"exporter_iso3": [], "v": []})
    assert _compute_hhi(df) == 0.0


def test_compute_hhi_zero_total_returns_zero():
    df = pd.DataFrame({"exporter_iso3": ["CHN"], "v": [0.0]})
    assert _compute_hhi(df) == 0.0


# ── _score_country ────────────────────────────────────────────────────────────

def _default_score(iso3="DEU", **overrides):
    kwargs = dict(
        iso3=iso3,
        epi_map={iso3: 70.0},
        lpi_data={iso3: 4.0},
        polstab_data={iso3: 1.0},
        labor_map={iso3: 30.0},
        energy_map={iso3: 20.0},
        bc={iso3: 0.1},
        weights={"sustainability": 0.33, "resilience": 0.34, "cost": 0.33},
        hhi=2500.0,
    )
    kwargs.update(overrides)
    return _score_country(**kwargs)


def test_score_country_returns_all_keys():
    score = _default_score()
    for key in ["iso3", "sustainability", "resilience", "cost_efficiency", "composite", "hhi", "epi", "lpi", "polstab"]:
        assert key in score


def test_score_country_composite_is_weighted_average():
    score = _default_score()
    expected = round(0.33 * score["sustainability"] + 0.34 * score["resilience"] + 0.33 * score["cost_efficiency"], 1)
    assert score["composite"] == pytest.approx(expected, abs=0.2)


def test_score_country_resilience_inverse_betweenness():
    score_low = _default_score(bc={"DEU": 0.0})
    score_high = _default_score(bc={"DEU": 0.5})
    assert score_low["resilience"] > score_high["resilience"]


def test_score_country_missing_data_uses_defaults():
    score = _score_country(
        iso3="XYZ",
        epi_map={}, lpi_data={}, polstab_data={},
        labor_map={}, energy_map={}, bc={},
        weights={"sustainability": 0.33, "resilience": 0.34, "cost": 0.33},
        hhi=0.0,
    )
    assert 0 <= score["composite"] <= 100


def test_score_country_polstab_normalization():
    score_neg = _default_score(polstab_data={"DEU": -2.5})
    score_pos = _default_score(polstab_data={"DEU": 2.5})
    assert score_pos["sustainability"] > score_neg["sustainability"]


# ── _build_path_analysis ──────────────────────────────────────────────────────

def test_build_path_analysis_no_segment_column():
    df = pd.DataFrame({"exporter_iso3": ["CHN"], "v": [100.0]})
    result = _build_path_analysis(df, [])
    assert result == []


def test_build_path_analysis_top5_per_segment():
    rows = [{"exporter_iso3": f"C{i:02d}", "segment_name": "Mining", "v": float(i * 10)} for i in range(1, 9)]
    df = pd.DataFrame(rows)
    country_scores = [{"iso3": f"C{i:02d}", "composite": float(i)} for i in range(1, 9)]
    result = _build_path_analysis(df, country_scores)
    assert len(result) == 5


def test_build_path_analysis_share_sums_to_100():
    rows = [{"exporter_iso3": f"C{i}", "segment_name": "Mining", "v": 25.0} for i in range(4)]
    df = pd.DataFrame(rows)
    result = _build_path_analysis(df, [])
    total_share = sum(r["share_pct"] for r in result)
    assert total_share == pytest.approx(100.0)


def test_build_path_analysis_composite_score_lookup():
    df = pd.DataFrame([{"exporter_iso3": "CHN", "segment_name": "Refining", "v": 100.0}])
    result = _build_path_analysis(df, [{"iso3": "CHN", "composite": 72.5}])
    assert result[0]["composite_score"] == 72.5


# ── _build_betweenness ────────────────────────────────────────────────────────

def test_build_betweenness_single_edge():
    df = pd.DataFrame([{"exporter_iso3": "CHN", "importer_iso3": "DEU", "v": 100.0}])
    bc = _build_betweenness(df)
    assert isinstance(bc, dict)


def test_build_betweenness_excludes_zero_value():
    df = pd.DataFrame([{"exporter_iso3": "CHN", "importer_iso3": "DEU", "v": 0.0}])
    bc = _build_betweenness(df)
    assert "CHN" not in bc or bc.get("CHN", 0) == 0.0


# ── compute_kpis (integration with mocks) ────────────────────────────────────

SAMPLE_DF = pd.DataFrame([
    {"exporter_iso3": "CHN", "importer_iso3": "DEU", "v": 500.0, "segment_name": "Mining"},
    {"exporter_iso3": "AUS", "importer_iso3": "DEU", "v": 500.0, "segment_name": "Mining"},
])


@pytest.fixture
def mock_data_dir(tmp_path):
    epi = pd.DataFrame({"iso3": ["CHN", "AUS", "DEU"], "epi_score": [40.0, 60.0, 80.0]})
    labor = pd.DataFrame({"iso3": ["CHN", "AUS", "DEU"], "labor_cost_index": [20.0, 30.0, 70.0]})
    energy = pd.DataFrame({"iso3": ["CHN", "AUS", "DEU"], "energy_cost_index": [15.0, 25.0, 65.0]})
    epi.to_csv(tmp_path / "epi_2024.csv", index=False)
    labor.to_csv(tmp_path / "labor_costs.csv", index=False)
    energy.to_csv(tmp_path / "energy_costs.csv", index=False)
    return str(tmp_path)


async def test_compute_kpis_returns_all_countries(mock_data_dir):
    with (
        patch("app.services.kpi_engine.pd.read_parquet", return_value=SAMPLE_DF),
        patch("app.services.kpi_engine.settings.temp_dir", "/tmp"),
        patch("app.services.kpi_engine.settings.data_dir", mock_data_dir),
        patch("app.services.kpi_engine.fetch_indicator", new=AsyncMock(return_value={})),
    ):
        result = await compute_kpis("test123", ["CHN", "AUS", "DEU"], {"sustainability": 0.33, "resilience": 0.34, "cost": 0.33})

    assert len(result["country_scores"]) == 3
    isos = {s["iso3"] for s in result["country_scores"]}
    assert isos == {"CHN", "AUS", "DEU"}


async def test_compute_kpis_excluded_countries_filtered(mock_data_dir):
    with (
        patch("app.services.kpi_engine.pd.read_parquet", return_value=SAMPLE_DF),
        patch("app.services.kpi_engine.settings.temp_dir", "/tmp"),
        patch("app.services.kpi_engine.settings.data_dir", mock_data_dir),
        patch("app.services.kpi_engine.fetch_indicator", new=AsyncMock(return_value={})),
    ):
        result = await compute_kpis(
            "test123", ["CHN", "AUS", "DEU"],
            {"sustainability": 0.33, "resilience": 0.34, "cost": 0.33},
            excluded_countries=["CHN"],
        )

    hhi_without_chn = result["hhi"]
    assert hhi_without_chn == pytest.approx(10000.0)


async def test_compute_kpis_file_not_found():
    with pytest.raises(Exception):
        await compute_kpis("nonexistent", ["CHN"], {"sustainability": 0.33, "resilience": 0.34, "cost": 0.33})
