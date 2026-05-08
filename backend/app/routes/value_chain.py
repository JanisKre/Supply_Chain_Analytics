from fastapi import APIRouter
from pydantic import BaseModel
from app.services.claude_client import generate_value_chain

router = APIRouter()


class ValueChainRequest(BaseModel):
    product: str


@router.post("/value-chain")
async def create_value_chain(req: ValueChainRequest):
    return await generate_value_chain(req.product)
