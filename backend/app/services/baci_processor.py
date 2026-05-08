import uuid
import os
import pandas as pd
from app.config import settings


async def process_baci_file(file_path: str, hs_codes: list[str]):
    """Async generator yielding SSE event dicts for each pipeline step."""
    hs_code_ints = [int(c) for c in hs_codes]
    data_dir = settings.data_dir

    # Step 1: Load CSV in chunks
    yield {"type": "log", "step": 1, "message": "Loading CSV file...", "rows_before": None, "rows_after": None}
    chunks = []
    for chunk in pd.read_csv(file_path, chunksize=100_000, low_memory=False):
        chunks.append(chunk)
    df = pd.concat(chunks, ignore_index=True)
    rows_raw = len(df)
    yield {"type": "log", "step": 1, "message": f"Loaded {rows_raw:,} rows", "rows_before": rows_raw, "rows_after": rows_raw}

    # Step 2: Fix number formats
    yield {"type": "log", "step": 2, "message": "Fixing number formats...", "rows_before": rows_raw, "rows_after": rows_raw}
    for col in ["v", "q"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.replace(",", "", regex=False)
            df[col] = pd.to_numeric(df[col], errors="coerce")
    if "t" in df.columns:
        df["t"] = pd.to_numeric(df["t"], errors="coerce")
    if "k" in df.columns:
        df["k"] = pd.to_numeric(df["k"], errors="coerce").astype("Int64")
    yield {"type": "log", "step": 2, "message": "Number formats fixed", "rows_before": rows_raw, "rows_after": rows_raw}

    # Step 3: Filter to HS codes
    yield {"type": "log", "step": 3, "message": f"Filtering to {len(hs_codes)} HS codes: {', '.join(hs_codes)}...", "rows_before": rows_raw, "rows_after": None}
    df = df[df["k"].isin(hs_code_ints)].copy()
    rows_filtered = len(df)
    yield {"type": "log", "step": 3, "message": f"After HS filter: {rows_filtered:,} rows", "rows_before": rows_raw, "rows_after": rows_filtered}

    # Step 4: Fill nulls
    if "q" in df.columns:
        df["q"] = df["q"].fillna(0)
    if "v" in df.columns:
        df["v"] = df["v"].fillna(0)
    yield {"type": "log", "step": 4, "message": "Null values filled", "rows_before": rows_filtered, "rows_after": rows_filtered}

    # Step 5: Merge country names
    yield {"type": "log", "step": 5, "message": "Adding country names (exporter & importer)...", "rows_before": rows_filtered, "rows_after": None}
    cc_path = os.path.join(data_dir, "country_codes_V202501.csv")
    cc = pd.read_csv(cc_path)
    cc.columns = cc.columns.str.strip()

    exp_cc = cc[["country_code", "country_name", "iso3"]].rename(
        columns={"country_code": "_i", "country_name": "exporter_name", "iso3": "exporter_iso3"}
    )
    imp_cc = cc[["country_code", "country_name", "iso3"]].rename(
        columns={"country_code": "_j", "country_name": "importer_name", "iso3": "importer_iso3"}
    )
    df = df.merge(exp_cc, left_on="i", right_on="_i", how="left").drop(columns=["_i"], errors="ignore")
    df = df.merge(imp_cc, left_on="j", right_on="_j", how="left").drop(columns=["_j"], errors="ignore")
    yield {"type": "log", "step": 5, "message": "Country names added", "rows_before": rows_filtered, "rows_after": len(df)}

    # Step 6: Merge HS mapping → segment labels
    yield {"type": "log", "step": 6, "message": "Adding VCS segment labels...", "rows_before": rows_filtered, "rows_after": None}
    hs_map_path = os.path.join(data_dir, "hs_code_mapping.csv")
    hs_map = pd.read_csv(hs_map_path)
    hs_map["hs_code"] = pd.to_numeric(hs_map["hs_code"], errors="coerce").astype("Int64")
    df = df.merge(
        hs_map[["hs_code", "segment_name", "vcs_id"]],
        left_on="k", right_on="hs_code", how="left"
    ).drop(columns=["hs_code"], errors="ignore")

    rows_final = len(df)
    yield {"type": "log", "step": 6, "message": f"Processing complete: {rows_final:,} enriched rows", "rows_before": rows_filtered, "rows_after": rows_final}

    # Save to Parquet
    file_id = str(uuid.uuid4())[:8]
    out_path = os.path.join(settings.temp_dir, f"baci_{file_id}.parquet")
    df.to_parquet(out_path, index=False)
    yield {"type": "log", "step": 7, "message": f"Saved to {out_path}", "rows_before": rows_final, "rows_after": rows_final}

    preview = df.head(200).fillna("").to_dict(orient="records")
    col_dtypes = {col: str(dtype) for col, dtype in df.dtypes.items()}

    yield {
        "type": "complete",
        "file_id": file_id,
        "row_count": rows_final,
        "preview": preview,
        "column_dtypes": col_dtypes,
    }
