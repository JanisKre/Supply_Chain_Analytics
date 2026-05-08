from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.sankey_builder import build_sankey

router = APIRouter()


class SankeyRequest(BaseModel):
    file_id: str
    threshold_pct: float = 2.0


@router.post("/sankey/prepare")
def prepare_sankey(req: SankeyRequest):
    try:
        return build_sankey(req.file_id, req.threshold_pct)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Processed file not found for file_id: {req.file_id}")
