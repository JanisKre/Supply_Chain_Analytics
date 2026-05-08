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

    df["exporter_name"] = df["exporter_name"].fillna(df["exporter_iso3"].fillna("Unknown"))
    df["importer_name"] = df["importer_name"].fillna(df["importer_iso3"].fillna("Unknown"))
    df["segment_name"] = df["segment_name"].fillna("Other")
    df["vcs_id"] = pd.to_numeric(df.get("vcs_id", 0), errors="coerce").fillna(0).astype(int)

    # Determine segment order by vcs_id
    seg_order = (
        df[["segment_name", "vcs_id"]].drop_duplicates()
        .sort_values("vcs_id")["segment_name"]
        .tolist()
    )

    # Build nodes and links stage by stage.
    # For segment at position seg_pos (0-indexed):
    #   exporter node = "{name}"           if seg_pos == 0  (pure raw-material sources)
    #   exporter node = "{name}{seg_pos}"  if seg_pos >  0  (country at level seg_pos)
    #   importer node = "{name}{seg_pos+1}" always          (country at level seg_pos+1)
    # This makes the same country node the target of stage N links and the
    # source of stage N+1 links, mirroring the reference Sankey.

    all_nodes: dict[str, int] = {}
    links: list[dict] = []

    for seg_pos, seg_name in enumerate(seg_order):
        seg_df = df[df["segment_name"] == seg_name]
        agg = (
            seg_df.groupby(["exporter_name", "importer_name"], as_index=False)["v"]
            .sum()
        )
        agg["share"] = agg["v"] / total * 100
        agg = agg[agg["share"] >= threshold_pct]

        for _, row in agg.iterrows():
            exp_name: str = row["exporter_name"]
            imp_name: str = row["importer_name"]

            exp_node = exp_name if seg_pos == 0 else f"{exp_name}{seg_pos}"
            imp_node = f"{imp_name}{seg_pos + 1}"

            if exp_node not in all_nodes:
                all_nodes[exp_node] = len(all_nodes)
            if imp_node not in all_nodes:
                all_nodes[imp_node] = len(all_nodes)

            links.append({
                "source": all_nodes[exp_node],
                "target": all_nodes[imp_node],
                "value": float(row["v"]),
                "vcs_segment": seg_name,
            })

    return {"nodes": list(all_nodes.keys()), "links": links, "total_trade_value": total}
