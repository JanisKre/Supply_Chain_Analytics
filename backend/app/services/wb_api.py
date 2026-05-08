import time
import httpx
from typing import Optional

_cache: dict = {}
CACHE_TTL = 86400  # 24 hours


async def fetch_indicator(indicator: str, countries: list[str]) -> dict[str, Optional[float]]:
    cache_key = f"{indicator}:{','.join(sorted(countries))}"
    if cache_key in _cache and time.time() - _cache[cache_key]["ts"] < CACHE_TTL:
        return _cache[cache_key]["data"]

    country_str = ";".join(countries)
    url = (
        f"https://api.worldbank.org/v2/country/{country_str}/indicator/{indicator}"
        f"?format=json&mrv=1&per_page=200"
    )

    result: dict[str, Optional[float]] = {}
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            if isinstance(data, list) and len(data) >= 2:
                for entry in data[1]:
                    iso3 = entry.get("countryiso3code", "")
                    val = entry.get("value")
                    if iso3 and val is not None:
                        result[iso3] = float(val)
    except Exception:
        pass  # Return empty dict on failure; caller uses defaults

    _cache[cache_key] = {"data": result, "ts": time.time()}
    return result
