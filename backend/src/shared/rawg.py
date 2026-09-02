import difflib
import logging
import os
import time
from decimal import Decimal
from typing import Optional

import requests

logger = logging.getLogger(__name__)

_RAWG_BASE = "https://api.rawg.io/api"
_TAG_LIMIT = 15


def _api_key() -> str:
    return os.environ.get("RAWG_API_KEY", "")


def _normalize(text: str) -> str:
    """Lowercase, strip punctuation loosely — used only for similarity comparison."""
    return text.lower().strip()


def _exe_to_name(exe_lower: str) -> str:
    """Strip .exe, replace underscores/hyphens with spaces, title-case."""
    stem = exe_lower
    if stem.endswith(".exe"):
        stem = stem[:-4]
    stem = stem.replace("_", " ").replace("-", " ")
    return stem.title()


def _confident_match(exe_lower: str, result: dict) -> bool:
    """Return True if the RAWG result is a confident match for exe_lower."""
    query_name = _normalize(_exe_to_name(exe_lower))
    result_name = _normalize(result.get("name", ""))
    ratio = difflib.SequenceMatcher(None, query_name, result_name).ratio()
    if ratio >= 0.60:
        return True
    # exe stem substring of RAWG slug
    exe_stem = exe_lower[:-4] if exe_lower.endswith(".exe") else exe_lower
    slug = result.get("slug", "")
    if exe_stem and exe_stem in slug:
        return True
    return False


def _parse_detail(exe_lower: str, summary: dict, detail: dict, fetched_at: int) -> dict:
    """Build a normalized metadata dict from RAWG search summary + detail response."""
    genres = [g["name"] for g in detail.get("genres") or []]
    # tags sorted by RAWG relevance (they come ranked by games_count descending)
    tags = [t["name"] for t in (detail.get("tags") or [])[:_TAG_LIMIT]]
    return {
        "pk": f"GAME#{exe_lower}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{fetched_at:020d}",
        "game_exe": exe_lower,
        "rawg_id": summary.get("id"),
        "name": detail.get("name") or summary.get("name"),
        "slug": detail.get("slug") or summary.get("slug"),
        "genres": genres,
        "tags": tags,
        "metacritic": detail.get("metacritic"),
        "released": detail.get("released"),
        "background_image": detail.get("background_image"),
        "rating": Decimal(str(detail["rating"])) if detail.get("rating") is not None else None,
        "fetched_at": fetched_at,
        "resolution_failed": False,
    }


def _failed_item(exe_lower: str, fetched_at: int) -> dict:
    return {
        "pk": f"GAME#{exe_lower}",
        "sk": "METADATA",
        "gsi2pk": "GAME",
        "gsi2sk": f"{fetched_at:020d}",
        "game_exe": exe_lower,
        "rawg_id": None,
        "name": None,
        "slug": None,
        "genres": [],
        "tags": [],
        "metacritic": None,
        "released": None,
        "background_image": None,
        "rating": None,
        "fetched_at": fetched_at,
        "resolution_failed": True,
    }


def fetch_metadata(exe_lower: str) -> dict:
    """
    Search RAWG for exe_lower. Always returns a metadata dict.
    Sets resolution_failed=True if no confident match or any network error.
    Does NOT retry on 429 — caller (cron) handles that on the next pass.
    """
    fetched_at = int(time.time())
    key = _api_key()
    search_name = _exe_to_name(exe_lower)

    try:
        resp = requests.get(
            f"{_RAWG_BASE}/games",
            params={"search": search_name, "page_size": 5, "key": key},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning("rawg_search_error exe=%s err=%s", exe_lower, exc)
        return _failed_item(exe_lower, fetched_at)

    if resp.status_code == 429:
        logger.warning("rawg_rate_limited exe=%s", exe_lower)
        return _failed_item(exe_lower, fetched_at)

    if not resp.ok:
        logger.warning("rawg_search_non_ok exe=%s status=%s", exe_lower, resp.status_code)
        return _failed_item(exe_lower, fetched_at)

    results = (resp.json().get("results") or [])
    if not results:
        return _failed_item(exe_lower, fetched_at)

    top = results[0]
    if not _confident_match(exe_lower, top):
        return _failed_item(exe_lower, fetched_at)

    # Fetch detail for genres + tags
    rawg_id = top["id"]
    try:
        detail_resp = requests.get(
            f"{_RAWG_BASE}/games/{rawg_id}",
            params={"key": key},
            timeout=10,
        )
    except requests.RequestException as exc:
        logger.warning("rawg_detail_error exe=%s rawg_id=%s err=%s", exe_lower, rawg_id, exc)
        return _failed_item(exe_lower, fetched_at)

    if not detail_resp.ok:
        logger.warning("rawg_detail_non_ok exe=%s status=%s", exe_lower, detail_resp.status_code)
        return _failed_item(exe_lower, fetched_at)

    return _parse_detail(exe_lower, top, detail_resp.json(), fetched_at)
