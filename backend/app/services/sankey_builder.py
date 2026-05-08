import os
import pandas as pd
from app.config import settings


def build_sankey(file_id: str, threshold_pct: float = 2.0) -> dict:
    path = os.path.join(settings.temp_dir, f"baci_{file_id}.parquet")
    df = pd.read_parquet(path)

    df = df[df["v"] > 0].copy()
    total = float(df["v"].sum())
    if total == 0:
        return {"nodes": [], "links": [], "total_trade_value": 0.0}

    # Fill missing names with ISO codes
    df["exporter_name"] = df["exporter_name"].fillna(df["exporter_iso3"].fillna("Unknown"))
    df["importer_name"] = df["importer_name"].fillna(df["importer_iso3"].fillna("Unknown"))
    df["segment_name"] = df["segment_name"].fillna("Other")

    # Aggregate exporter → segment → importer
    agg = (
        df.groupby(["exporter_name", "segment_name", "importer_name"], as_index=False)["v"]
        .sum()
    )
    agg["share"] = agg["v"] / total * 100
    agg = agg[agg["share"] >= threshold_pct].copy()

    # Build node list (deduplicated, order: exporters, segments, importers)
    exporters = list(agg["exporter_name"].unique())
    segments = list(agg["segment_name"].unique())
    importers = [n for n in agg["importer_name"].unique() if n not in exporters and n not in segments]
    all_nodes = exporters + segments + importers
    node_idx = {n: i for i, n in enumerate(all_nodes)}

    links = []
    # exporter → segment
    exp_seg = agg.groupby(["exporter_name", "segment_name"], as_index=False)["v"].sum()
    for _, row in exp_seg.iterrows():
        src = node_idx.get(row["exporter_name"])
        tgt = node_idx.get(row["segment_name"])
        if src is not None and tgt is not None:
            links.append({
                "source": src,
                "target": tgt,
                "value": float(row["v"]),
                "vcs_segment": row["segment_name"],
            })

    # segment → importer
    seg_imp = agg.groupby(["segment_name", "importer_name"], as_index=False)["v"].sum()
    for _, row in seg_imp.iterrows():
        src = node_idx.get(row["segment_name"])
        tgt = node_idx.get(row["importer_name"])
        if src is not None and tgt is not None:
            links.append({
                "source": src,
                "target": tgt,
                "value": float(row["v"]),
                "vcs_segment": row["segment_name"],
            })

    return {"nodes": all_nodes, "links": links, "total_trade_value": total}
