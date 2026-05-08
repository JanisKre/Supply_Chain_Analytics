from fastapi import APIRouter
from pydantic import BaseModel
from app.services.claude_client import assign_hs_codes

router = APIRouter()

MANUAL_ASSIGNMENTS = [
    {"segment_id": 1, "segment_name": "Mining", "hs_codes": ["261790", "253090"], "source": "REPM Teaching Case"},
    {"segment_id": 2, "segment_name": "Mineral Processing & Refining", "hs_codes": ["280450", "720310", "280530", "284690"], "source": "REPM Teaching Case"},
    {"segment_id": 3, "segment_name": "Magnet Parts & Components", "hs_codes": ["850590"], "source": "REPM Teaching Case"},
    {"segment_id": 4, "segment_name": "Magnet Manufacturing", "hs_codes": ["850511", "850300"], "source": "REPM Teaching Case"},
]


class HSCodesRequest(BaseModel):
    product: str
    segments: list


@router.post("/hs-codes")
async def assign_hs_codes_route(req: HSCodesRequest):
    llm_result = await assign_hs_codes(req.product, req.segments)

    llm_flat = set()
    for a in llm_result["assignments"]:
        llm_flat.update(a.get("hs_codes", []))

    manual_flat = []
    for a in MANUAL_ASSIGNMENTS:
        manual_flat.extend(a["hs_codes"])

    overlap = sum(1 for c in manual_flat if c in llm_flat)
    agreement_rate = overlap / len(manual_flat) if manual_flat else 0.0

    return {
        "llm_assignments": llm_result["assignments"],
        "manual_assignments": MANUAL_ASSIGNMENTS,
        "agreement_rate": round(agreement_rate, 2),
        "prompt_used": llm_result["prompt_used"],
        "raw_llm_response": llm_result["raw_llm_response"],
    }
