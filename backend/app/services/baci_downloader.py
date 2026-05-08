import asyncio
import os
import zipfile
import uuid
import httpx
import aiofiles
from app.config import settings

BACI_ZIP_URL = "https://www.cepii.fr/DATA_DOWNLOAD/baci/data/BACI_HS22_V202601.zip"
BACI_CSV_NAME = "BACI_HS22_Y2023_V202601.csv"
MAX_DOWNLOAD_RETRIES = 3


def _make_progress_log(downloaded: int, total: int, last_pct: int) -> dict | None:
    if not total:
        return None
    pct = int(downloaded / total * 100)
    if pct == last_pct or pct % 5 != 0:
        return None
    mb, total_mb = downloaded / 1024 / 1024, total / 1024 / 1024
    return {"type": "log", "step": 1, "message": f"Downloading… {mb:.0f} MB / {total_mb:.0f} MB ({pct}%)", "pct": pct}


async def _download_zip(url: str, dest: str):
    """Stream-download a file. Yields (downloaded_bytes, total_bytes) tuples."""
    async with httpx.AsyncClient(timeout=None, follow_redirects=True) as client:
        async with client.stream("GET", url) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", 0))
            downloaded = 0
            async with aiofiles.open(dest, "wb") as f:
                async for chunk in resp.aiter_bytes(chunk_size=1024 * 512):
                    await f.write(chunk)
                    downloaded += len(chunk)
                    yield downloaded, total
    yield downloaded, total


async def _stream_download_events(tmp_zip: str):
    """
    Async generator: download with retries, yielding SSE log dicts.
    Raises the last exception if all retries are exhausted.
    """
    last_error: Exception | None = None
    downloaded = 0

    for attempt in range(MAX_DOWNLOAD_RETRIES):
        if attempt > 0:
            wait = 2 ** (attempt - 1)
            yield {"type": "log", "step": 1, "message": f"Retrying (attempt {attempt + 1}/{MAX_DOWNLOAD_RETRIES}) in {wait}s…", "pct": 0}
            await asyncio.sleep(wait)
            _cleanup(tmp_zip)

        yield {"type": "log", "step": 1, "message": "Connecting to CEPII…", "pct": 0}

        try:
            last_pct, downloaded = -1, 0
            async for downloaded, total in _download_zip(BACI_ZIP_URL, tmp_zip):
                log = _make_progress_log(downloaded, total, last_pct)
                if log:
                    yield log
                    last_pct = log["pct"]
            yield {"type": "log", "step": 1, "message": f"Download complete ({downloaded / 1024 / 1024:.0f} MB)", "pct": 100}
            return
        except Exception as e:
            last_error = e

    raise last_error  # type: ignore[misc]


async def _extract_csv(zip_path: str, dest_csv: str) -> str:
    """Extract the BACI CSV from a ZIP archive. Returns the extracted filename."""
    with zipfile.ZipFile(zip_path, "r") as zf:
        names = zf.namelist()
        target = next((n for n in names if BACI_CSV_NAME in n), None)
        if target is None:
            csvs = sorted(
                [(n, zf.getinfo(n).file_size) for n in names if n.lower().endswith(".csv")],
                key=lambda x: x[1],
                reverse=True,
            )
            if not csvs:
                raise ValueError(f"No CSV found in ZIP. Files: {names[:10]}")
            target = csvs[0][0]

        with zf.open(target) as src:
            async with aiofiles.open(dest_csv, "wb") as dst:
                while chunk := src.read(1024 * 1024):
                    await dst.write(chunk)

    return target


async def download_and_process(hs_codes: list[str]):
    """
    Async generator — streams SSE events for download → extract → process pipeline.
    Yields dicts with type 'log' or 'complete'.
    """
    tmp_zip = os.path.join(settings.temp_dir, f"baci_dl_{uuid.uuid4().hex[:8]}.zip")
    tmp_csv = os.path.join(settings.temp_dir, f"baci_dl_{uuid.uuid4().hex[:8]}.csv")

    # ── Step 1: Download ZIP ────────────────────────────────────────────────
    try:
        async for event in _stream_download_events(tmp_zip):
            yield event
    except Exception as e:
        yield {"type": "error", "message": f"Download failed after {MAX_DOWNLOAD_RETRIES} attempts: {e}"}
        _cleanup(tmp_zip, tmp_csv)
        return

    # ── Step 2: Extract CSV ─────────────────────────────────────────────────
    yield {"type": "log", "step": 2, "message": f"Extracting {BACI_CSV_NAME}…", "pct": 0}
    try:
        target = await _extract_csv(tmp_zip, tmp_csv)
        os.unlink(tmp_zip)
        csv_size_mb = os.path.getsize(tmp_csv) / 1024 / 1024
        yield {"type": "log", "step": 2, "message": f"Extracted {target} ({csv_size_mb:.0f} MB)", "pct": 100}
    except Exception as e:
        yield {"type": "error", "message": f"Extraction failed: {e}"}
        _cleanup(tmp_zip, tmp_csv)
        return

    # ── Steps 3–7: Process CSV ──────────────────────────────────────────────
    from app.services.baci_processor import process_baci_file
    async for event in process_baci_file(tmp_csv, hs_codes):
        yield event

    _cleanup(tmp_csv)


def _cleanup(*paths: str):
    for path in paths:
        if path and os.path.exists(path):
            try:
                os.unlink(path)
            except OSError:
                pass
