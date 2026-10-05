"""Steam import: playtime Steam already recorded before DECK'D.

Storage (same table, kept apart from tracked play):
    USER#{id} / IMPORT#{source}#{external_id}   one imported game
    USER#{id} / IMPORTMETA#{source}             summary of the last import
    USER#{id} / IMPORTREQ                       web asked the PC to re-import

Rules:
  * A re-import REPLACES that source's previous import (writes the new set,
    deletes anything no longer present). It never adds duplicates.
  * Tracked sessions (SESSION#…) are never read or written here.
  * Imported hours are combined with tracked hours only when the dashboard
    is read: per game, total = max(tracked, imported) — never a sum, so an
    hour both the launcher and DECK'D saw is counted once.
"""
from __future__ import annotations

import logging
import time
from typing import Optional

import requests
from boto3.dynamodb.conditions import Key

from .db import get_table

logger = logging.getLogger(__name__)

SOURCES = ("steam",)  # sources are keyed so another launcher can be added later
SOURCE_LABEL = {"steam": "Steam"}

_STEAM_STORE = "https://store.steampowered.com/api/appdetails"
_STEAM_ASSETS = "https://shared.akamai.steamstatic.com/store_item_assets/steam/apps"
# Title lookups per request: bounded so a big library can't exceed the
# Lambda timeout; anything unresolved keeps a placeholder and resolves on
# the next import (names are cached for everyone, so it converges fast).
MAX_NAME_LOOKUPS = 40


def loose(text: Optional[str]) -> str:
    """Letters and digits only, for matching titles across launchers."""
    return "".join(ch for ch in (text or "").lower() if ch.isalnum())


def steam_images(appid: str) -> dict:
    """Steam's own art: landscape header and 3:4 library cover."""
    return {
        "background_image": f"{_STEAM_ASSETS}/{appid}/header.jpg",
        "cover_image": f"{_STEAM_ASSETS}/{appid}/library_600x900.jpg",
    }


# ── Steam titles (only needed for games that aren't installed) ───────────────

def _cached_steam_names(appids: list[str]) -> dict[str, str]:
    out: dict[str, str] = {}
    table = get_table()
    for appid in appids:
        item = table.get_item(Key={"pk": f"STEAMAPP#{appid}", "sk": "META"}).get("Item")
        if item and item.get("name"):
            out[appid] = item["name"]
    return out


def _fetch_steam_name(appid: str) -> Optional[str]:
    try:
        resp = requests.get(_STEAM_STORE, params={"appids": appid, "filters": "basic"}, timeout=4)
        if not resp.ok:
            return None
        entry = (resp.json() or {}).get(str(appid)) or {}
        if not entry.get("success"):
            return None
        name = (entry.get("data") or {}).get("name")
        return name.strip()[:200] if isinstance(name, str) and name.strip() else None
    except (requests.RequestException, ValueError):
        return None


def resolve_steam_names(appids: list[str]) -> dict[str, str]:
    """appid → title, from the shared cache first, then Steam's public store
    API (bounded). New titles are cached globally (not per user)."""
    names = _cached_steam_names(appids)
    missing = [a for a in appids if a not in names][:MAX_NAME_LOOKUPS]
    table = get_table()
    for appid in missing:
        name = _fetch_steam_name(appid)
        if name:
            names[appid] = name
            table.put_item(Item={"pk": f"STEAMAPP#{appid}", "sk": "META", "name": name,
                                 "fetched_at": int(time.time())})
    return names


# ── per-user import records ──────────────────────────────────────────────────

def _query_prefix(user_id: str, prefix: str) -> list[dict]:
    items: list[dict] = []
    kwargs = {"KeyConditionExpression": Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with(prefix)}
    while True:
        resp = get_table().query(**kwargs)
        items.extend(resp.get("Items", []))
        if not resp.get("LastEvaluatedKey"):
            return items
        kwargs["ExclusiveStartKey"] = resp["LastEvaluatedKey"]


def list_imported_games(user_id: str) -> list[dict]:
    # "IMPORT#" does not match "IMPORTMETA#" / "IMPORTREQ" (next char differs).
    return _query_prefix(user_id, "IMPORT#")


def list_import_summaries(user_id: str) -> list[dict]:
    return _query_prefix(user_id, "IMPORTMETA#")


def replace_import(
    user_id: str,
    source: str,
    games: list[dict],
    account_label: Optional[str],
    method: str = "pc",
) -> dict:
    """Overwrite this source's import with `games`. Returns the new summary."""
    now = int(time.time())
    prefix = f"IMPORT#{source}#"
    existing = {i["sk"] for i in _query_prefix(user_id, prefix)}
    new_keys: set[str] = set()
    total_minutes = 0
    table = get_table()
    with table.batch_writer() as batch:
        for g in games:
            sk = f"{prefix}{g['external_id']}"
            new_keys.add(sk)
            total_minutes += int(g["minutes"])
            item = {
                "pk": f"USER#{user_id}",
                "sk": sk,
                "source": source,
                "external_id": g["external_id"],
                "name": g["name"],
                "minutes": int(g["minutes"]),
                "imported_at": now,
            }
            if g.get("last_played"):
                item["last_played"] = int(g["last_played"])
            if g.get("launcher"):
                item["launcher"] = g["launcher"]
            batch.put_item(Item=item)
        for sk in existing - new_keys:  # games gone from the launcher since last time
            batch.delete_item(Key={"pk": f"USER#{user_id}", "sk": sk})
    summary = {
        "pk": f"USER#{user_id}",
        "sk": f"IMPORTMETA#{source}",
        "source": source,
        "count": len(new_keys),
        "total_minutes": total_minutes,
        "imported_at": now,
        "method": method,  # "steam_api" (Steam connection) or "pc" (tracker)
    }
    if account_label:
        summary["account_label"] = account_label
    table.put_item(Item=summary)
    return summary


def delete_import(user_id: str, source: str) -> int:
    keys = [i["sk"] for i in _query_prefix(user_id, f"IMPORT#{source}#")]
    table = get_table()
    with table.batch_writer() as batch:
        for sk in keys:
            batch.delete_item(Key={"pk": f"USER#{user_id}", "sk": sk})
        batch.delete_item(Key={"pk": f"USER#{user_id}", "sk": f"IMPORTMETA#{source}"})
    return len(keys)


def request_import(user_id: str) -> int:
    now = int(time.time())
    get_table().put_item(Item={"pk": f"USER#{user_id}", "sk": "IMPORTREQ", "requested_at": now})
    return now


def get_import_request(user_id: str) -> Optional[int]:
    item = get_table().get_item(Key={"pk": f"USER#{user_id}", "sk": "IMPORTREQ"}).get("Item")
    return int(item["requested_at"]) if item else None


def clear_import_request(user_id: str, upto: int) -> None:
    """Clear the request if it was made before this import started."""
    req = get_import_request(user_id)
    if req is not None and req <= upto:
        get_table().delete_item(Key={"pk": f"USER#{user_id}", "sk": "IMPORTREQ"})


# ── combining with tracked play (dashboard read path) ────────────────────────

def merge_into_dashboard(games: list[dict], imported: list[dict]) -> tuple[list[dict], float]:
    """Add imported playtime to dashboard rows without double counting.

    Matched by title. For a tracked game: total = max(tracked, imported).
    Imported-only games become rows of their own (no momentum: imports have
    no session timestamps). Returns (rows, extra_hours_added_to_the_total).
    """
    by_name: dict[str, list[dict]] = {}
    for item in imported:
        by_name.setdefault(loose(item.get("name")), []).append(item)

    extra_sec = 0.0
    used: set[str] = set()
    for row in games:
        key = loose(row.get("game"))
        matches = by_name.get(key) or []
        tracked_sec = float(row.get("total_sec") or 0)
        row["tracked_hours"] = row.get("total_hours", 0)
        if not matches:
            continue
        used.add(key)
        imported_sec = sum(int(m["minutes"]) for m in matches) * 60
        _annotate(row, matches, imported_sec)
        if imported_sec > tracked_sec:
            extra_sec += imported_sec - tracked_sec
            row["total_sec"] = imported_sec
            row["total_hours"] = round(imported_sec / 3600, 2)
        if not row.get("background_image"):
            steam = next((m for m in matches if m.get("source") == "steam"), None)
            if steam:
                row.update({k: v for k, v in steam_images(steam["external_id"]).items()})

    only_imported = []
    for key, matches in by_name.items():
        if key in used or not key:
            continue
        imported_sec = sum(int(m["minutes"]) for m in matches) * 60
        if imported_sec <= 0:
            continue
        steam = next((m for m in matches if m.get("source") == "steam"), None)
        row = {
            "game": matches[0]["name"],
            "rawg_id": None,
            "slug": None,
            "background_image": None,
            "total_sec": imported_sec,
            "total_hours": round(imported_sec / 3600, 2),
            "tracked_hours": 0,
            "decay_sec": 0,
            "decay_hours": 0,
        }
        if steam:
            row.update(steam_images(steam["external_id"]))
        _annotate(row, matches, imported_sec)
        extra_sec += imported_sec
        only_imported.append(row)

    only_imported.sort(key=lambda r: r["total_sec"], reverse=True)
    return games + only_imported, round(extra_sec / 3600, 2)


def _annotate(row: dict, matches: list[dict], imported_sec: float) -> None:
    row["imported_hours"] = round(imported_sec / 3600, 2)
    row["imported_from"] = sorted({m.get("launcher") or SOURCE_LABEL.get(m.get("source"), "") for m in matches})
    last = max((int(m.get("last_played") or 0) for m in matches), default=0)
    if last:
        row["imported_last_played"] = last


# ── Steam connection (verified account) ─────────────────────────────────────

NONCE_TTL_SEC = 10 * 60


def put_steam_nonce(user_id: str, nonce: str, return_to: str) -> None:
    now = int(time.time())
    get_table().put_item(Item={
        "pk": f"USER#{user_id}", "sk": "STEAMNONCE", "nonce": nonce,
        "return_to": return_to, "expires_at": now + NONCE_TTL_SEC, "ttl": now + NONCE_TTL_SEC,
    })


def take_steam_nonce(user_id: str) -> Optional[dict]:
    """Return the pending sign-in (if not expired) and delete it: one use only."""
    table = get_table()
    key = {"pk": f"USER#{user_id}", "sk": "STEAMNONCE"}
    item = table.get_item(Key=key).get("Item")
    if not item:
        return None
    table.delete_item(Key=key)
    if int(item.get("expires_at", 0)) < int(time.time()):
        return None
    return item


def get_steam_link(user_id: str) -> Optional[dict]:
    return get_table().get_item(Key={"pk": f"USER#{user_id}", "sk": "STEAMLINK"}).get("Item")


def put_steam_link(user_id: str, steamid: str, name: Optional[str], avatar: Optional[str]) -> dict:
    item = {"pk": f"USER#{user_id}", "sk": "STEAMLINK", "steamid": steamid,
            "linked_at": int(time.time()), "api_ok": False}
    if name:
        item["name"] = name
    if avatar:
        item["avatar"] = avatar
    get_table().put_item(Item=item)
    return item


def set_steam_api_status(user_id: str, ok: bool, error: Optional[str] = None) -> None:
    expr = "SET api_ok = :ok, api_checked_at = :t"
    values = {":ok": ok, ":t": int(time.time())}
    if error:
        expr += ", api_error = :e"
        values[":e"] = error
    else:
        expr += " REMOVE api_error"
    get_table().update_item(
        Key={"pk": f"USER#{user_id}", "sk": "STEAMLINK"},
        UpdateExpression=expr,
        ExpressionAttributeValues=values,
        ConditionExpression="attribute_exists(pk)",
    )


def delete_steam_link(user_id: str) -> None:
    get_table().delete_item(Key={"pk": f"USER#{user_id}", "sk": "STEAMLINK"})
