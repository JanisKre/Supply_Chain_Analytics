import json
import os
import uuid
import aiofiles
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from app.services.baci_processor import process_baci_file
from app.services.baci_downloader import download_and_process
from app.config import settings

router = APIRouter()

SSE_HEADERS = {
    "Cache-Control": "no-cache",
    "X-Accel-Buffering": "no",
}


@router.post("/baci/download")
async def auto_download_baci(body: dict):
    """Auto-download BACI HS22 from CEPII, extract, and process."""
    hs_code_list: list[str] = body.get("hs_codes", [])

    async def event_stream():
        async for event in download_and_process(hs_code_list):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=SSE_HEADERS)


@router.post("/baci/process")
async def process_baci(file: UploadFile = File(...), hs_codes: str = Form(...)):
    """Manual CSV upload fallback."""
    hs_code_list: list[str] = json.loads(hs_codes)

    tmp_path = os.path.join(settings.temp_dir, f"baci_upload_{uuid.uuid4().hex[:8]}.csv")

    async with aiofiles.open(tmp_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    async def event_stream():
        try:
            async for event in process_baci_file(tmp_path, hs_code_list):
                yield f"data: {json.dumps(event)}\n\n"
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass

    return StreamingResponse(event_stream(), media_type="text/event-stream", headers=SSE_HEADERS)
