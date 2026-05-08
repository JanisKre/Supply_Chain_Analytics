import os
import io
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from app.config import settings

router = APIRouter()


@router.get("/export/baci/{file_id}")
async def export_baci_csv(file_id: str):
    path = os.path.join(settings.temp_dir, f"baci_{file_id}.parquet")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Processed file not found for file_id: {file_id}")

    df = pd.read_parquet(path)
    buf = io.StringIO()
    df.to_csv(buf, index=False)
    buf.seek(0)

    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=baci_{file_id}.csv"},
    )
