"""Regressions for the commit security review: no API keys in logs, and the
shared art cache can't be poisoned across users through a reported title."""
import json

import requests

import shared.db as db_module
from handlers.dashboard import handler as dashboard
from shared.canonical import meta_applies
from shared.models import Session
from shared.safe_log import safe_error
from tests.unit.conftest import FakeLambdaContext, USER_ID, make_event


def test_safe_error_redacts_keys_in_urls():
    exc = requests.ConnectionError(
        "HTTPSConnectionPool: Max retries exceeded with url: "
        "/IPlayerService/GetOwnedGames/v1/?key=SECRETSTEAMKEY&steamid=1 (Caused by ...)")
    text = safe_error(exc)
    assert "SECRETSTEAMKEY" not in text and "key=***" in text
    assert "steamid=1" in text  # only secrets are removed
    assert "SECRET" not in safe_error(ValueError("api.rawg.io/api/games?search=x&key=SECRET"))


def _meta(exe, name, title=None):
    item = {"pk": f"GAME#{exe}", "sk": "METADATA", "gsi2pk": "GAME", "gsi2sk": "1", "game_exe": exe,
            "rawg_id": 666, "name": name, "slug": "poison", "background_image": "https://evil/x.jpg",
            "fetched_at": 1, "resolution_failed": False}
    if title:
        item["resolved_from_title"] = "".join(c for c in title.lower() if c.isalnum())
    return item


def test_title_resolved_entries_only_apply_to_that_title():
    meta = _meta("valorant.exe", "Some Other Game", title="Some Other Game")
    assert meta_applies(meta, "Some Other Game")
    assert meta_applies(meta, "some other game!")
    assert not meta_applies(meta, "VALORANT")
    assert meta_applies(_meta("x.exe", "X"), "anything")  # exe-only entries unchanged


def test_poisoned_cache_entry_does_not_relabel_another_users_game(ddb_table):
    # Another account uploaded valorant.exe titled "Some Other Game" first.
    db_module.put_game_metadata(_meta("valorant.exe", "Some Other Game", title="Some Other Game"))
    db_module.put_session(Session(user_id=USER_ID, session_id="s1", game_exe="VALORANT.exe",
                                  game_name="VALORANT", started_at=1000, ended_at=4600,
                                  duration_sec=3600, label="tracked"))
    body = json.loads(dashboard(make_event(method="GET"), FakeLambdaContext())["body"])
    game = body["games"][0]
    assert game["game"] == "VALORANT"
    assert game["rawg_id"] is None and game["background_image"] is None


def test_matching_title_still_gets_art(ddb_table):
    db_module.put_game_metadata(_meta("lurk.exe", "Lurk in the Dark: Prologue",
                                      title="Lurk in the Dark : Prologue"))
    db_module.put_session(Session(user_id=USER_ID, session_id="s1", game_exe="lurk.exe",
                                  game_name="Lurk in the Dark : Prologue", started_at=1000,
                                  ended_at=4600, duration_sec=3600, label="tracked"))
    game = json.loads(dashboard(make_event(method="GET"), FakeLambdaContext())["body"])["games"][0]
    assert game["rawg_id"] == 666 and game["background_image"]


def test_a_squatted_title_does_not_block_other_titles(ddb_table, monkeypatch):
    """Someone uploads a common exe with a bogus title first; a real player's
    title still gets its own lookup and art (no shared slot to squat)."""
    import shared.metadata_ingest as mi
    from shared.canonical import cache_id

    def fake_fetch(exe, name=None):
        return _meta(exe, name or "x", title=name)

    monkeypatch.setattr(mi, "fetch_metadata", fake_fetch)
    squat = Session(user_id="attacker", session_id="a1", game_exe="VALORANT.exe", game_name="Bogus",
                    started_at=1000, ended_at=4600, duration_sec=3600, label="tracked")
    real = Session(user_id=USER_ID, session_id="s1", game_exe="VALORANT.exe", game_name="VALORANT",
                   started_at=1000, ended_at=4600, duration_sec=3600, label="tracked")
    assert mi.ensure_metadata([squat]) == 1
    assert mi.ensure_metadata([real]) == 1  # its own entry, not blocked
    assert db_module.get_game_metadata(cache_id("valorant.exe", "VALORANT"))["name"] == "VALORANT"
    db_module.put_session(real)
    game = json.loads(dashboard(make_event(method="GET"), FakeLambdaContext())["body"])["games"][0]
    assert game["game"] == "VALORANT" and game["background_image"]
