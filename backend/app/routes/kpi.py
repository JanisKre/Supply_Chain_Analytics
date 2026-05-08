from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.kpi_engine import compute_kpis

router = APIRouter()


class KPIWeights(BaseModel):
    sustainability: float = 0.33
    resilience: float = 0.34
    cost: float = 0.33


class KPIRequest(BaseModel):
    file_id: str
    country_list: list[str]
    weights: KPIWeights = KPIWeights()


class ScenarioRequest(BaseModel):
    file_id: str
    country_list: list[str]
    weights: KPIWeights = KPIWeights()
    excluded_countries: list[str]


@router.post("/kpi/compute")
async def compute_kpi(req: KPIRequest):
    try:
        return await compute_kpis(req.file_id, req.country_list, req.weights.model_dump())
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Processed file not found for file_id: {req.file_id}")


@router.post("/kpi/scenario")
async def compute_scenario(req: ScenarioRequest):
    try:
        return await compute_kpis(
            req.file_id, req.country_list, req.weights.model_dump(),
            excluded_countries=req.excluded_countries,
        )
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"Processed file not found for file_id: {req.file_id}")
