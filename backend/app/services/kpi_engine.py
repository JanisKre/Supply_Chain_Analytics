import os
import pandas as pd
import networkx as nx
from app.config import settings
from app.services.wb_api import fetch_indicator


def _load_ref_maps(data_dir: str) -> tuple[dict, dict, dict]:
    epi = pd.read_csv(os.path.join(data_dir, "epi_2024.csv"))
    labor = pd.read_csv(os.path.join(data_dir, "labor_costs.csv"))
    energy = pd.read_csv(os.path.join(data_dir, "energy_costs.csv"))
    return (
        dict(zip(epi["iso3"], epi["epi_score"])),
        dict(zip(labor["iso3"], labor["labor_cost_index"])),
        dict(zip(energy["iso3"], energy["energy_cost_index"])),
    )


def _compute_hhi(df: pd.DataFrame) -> float:
    total_v = df["v"].sum()
    if total_v == 0:
        return 0.0
    shares = df.groupby("exporter_iso3")["v"].sum() / total_v
    return float((shares ** 2).sum()) * 10000


def _build_betweenness(df: pd.DataFrame) -> dict:
    G = nx.DiGraph()
    for _, row in df.iterrows():
        src = str(row.get("exporter_iso3") or "")
        tgt = str(row.get("importer_iso3") or "")
        v = float(row.get("v", 0) or 0)
        if src and tgt and v > 0:
            if G.has_edge(src, tgt):
                G[src][tgt]["weight"] += v
            else:
                G.add_edge(src, tgt, weight=v)
    return nx.betweenness_centrality(G, weight="weight", normalized=True)


def _score_country(
    iso3: str,
    epi_map: dict,
    lpi_data: dict,
    polstab_data: dict,
    labor_map: dict,
    energy_map: dict,
    bc: dict,
    weights: dict,
    hhi: float,
) -> dict:
    epi_score = epi_map.get(iso3, 50.0)
    lpi_raw = lpi_data.get(iso3, 2.5)
    polstab_raw = polstab_data.get(iso3, 0.0)
    polstab_norm = min(100.0, max(0.0, (polstab_raw + 2.5) / 5.0 * 100))

    sustainability = (epi_score + polstab_norm) / 2
    bc_val = bc.get(iso3, 0.0)
    resilience = max(0.0, 100.0 - bc_val * 100)
    labor_cost = labor_map.get(iso3, 50.0)
    energy_cost = energy_map.get(iso3, 50.0)
    cost_efficiency = max(0.0, 100.0 - (labor_cost + energy_cost) / 2)

    w_sust = weights.get("sustainability", 0.33)
    w_res = weights.get("resilience", 0.34)
    w_cost = weights.get("cost", 0.33)
    composite = w_sust * sustainability + w_res * resilience + w_cost * cost_efficiency

    return {
        "iso3": iso3,
        "sustainability": round(sustainability, 1),
        "resilience": round(resilience, 1),
        "cost_efficiency": round(cost_efficiency, 1),
        "composite": round(composite, 1),
        "hhi": round(hhi, 1),
        "betweenness_centrality": round(bc_val, 4),
        "lpi": round(lpi_raw, 2),
        "polstab": round(polstab_raw, 2),
        "epi": round(epi_score, 1),
    }


def _build_path_analysis(df: pd.DataFrame, country_scores: list[dict]) -> list[dict]:
    if "segment_name" not in df.columns:
        return []
    score_map = {s["iso3"]: s["composite"] for s in country_scores}
    path_analysis = []
    for segment, grp in df.groupby("segment_name"):
        seg_total = grp["v"].sum()
        top5 = grp.groupby("exporter_iso3")["v"].sum().nlargest(5).reset_index()
        for _, row in top5.iterrows():
            iso3 = row["exporter_iso3"]
            share = round(float(row["v"]) / seg_total * 100, 1) if seg_total > 0 else 0.0
            path_analysis.append({
                "segment": segment,
                "exporter_iso3": iso3,
                "trade_value": float(row["v"]),
                "share_pct": share,
                "composite_score": score_map.get(iso3),
            })
    return path_analysis


async def compute_kpis(
    file_id: str,
    country_list: list[str],
    weights: dict,
    excluded_countries: list[str] | None = None,
) -> dict:
    path = os.path.join(settings.temp_dir, f"baci_{file_id}.parquet")
    df = pd.read_parquet(path)
    if excluded_countries:
        df = df[~df["exporter_iso3"].isin(excluded_countries)]

    epi_map, labor_map, energy_map = _load_ref_maps(settings.data_dir)
    lpi_data, polstab_data = await _fetch_wb_indicators(country_list)

    hhi = _compute_hhi(df)
    bc = _build_betweenness(df)

    country_scores = [
        _score_country(iso3, epi_map, lpi_data, polstab_data, labor_map, energy_map, bc, weights, hhi)
        for iso3 in country_list
    ]

    return {
        "country_scores": country_scores,
        "path_analysis": _build_path_analysis(df, country_scores),
        "hhi": round(hhi, 1),
        "data_sources": {
            "epi": "Yale EPI 2024 (bundled CSV)",
            "lpi": "World Bank LPI 2023 (live API)",
            "political_stability": "World Bank Governance Indicators 2023 (live API)",
            "labor_costs": "Bundled index (various sources)",
            "energy_costs": "Bundled index (IEA 2023)",
        },
    }


async def _fetch_wb_indicators(country_list: list[str]) -> tuple[dict, dict]:
    lpi_data = await fetch_indicator("LP.LPI.OVRL.XQ", country_list)
    polstab_data = await fetch_indicator("PV.EST", country_list)
    return lpi_data, polstab_data
