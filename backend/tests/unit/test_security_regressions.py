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


# ── review 3: key collision, lookup budget, refresh fairness ─────────────────

def test_exe_names_with_separator_are_refused():
    import pytest
    from pydantic import ValidationError
    from shared.schemas import SessionCreate
    base = dict(session_id="s", game_name="G", started_at=1000, ended_at=1600, duration_sec=600)
    with pytest.raises(ValidationError):
        SessionCreate(game_exe="valorant.exe#t:valorant", **base)
    with pytest.raises(ValidationError):
        SessionCreate(game_exe="a\x00.exe", **base)
    with pytest.raises(ValidationError):
        SessionCreate(game_exe="ok.exe", **{**base, "game_name": "x" * 201})
    assert SessionCreate(game_exe="Hades II.exe", **base).game_exe == "Hades II.exe"


def test_cache_id_cannot_be_forged_through_the_exe():
    from shared.canonical import cache_id
    assert cache_id("valorant.exe#t:valorant", "") != cache_id("valorant.exe", "VALORANT")


def test_daily_lookup_budget_per_user(ddb_table, monkeypatch):
    import shared.metadata_ingest as mi
    calls = []
    monkeypatch.setattr(mi, "fetch_metadata", lambda exe, name=None: calls.append(exe) or _meta(exe, name, title=name))
    monkeypatch.setattr(mi, "MAX_LOOKUPS_PER_USER_PER_DAY", 4)
    for i in range(3):  # 3 requests x 3 new titles each
        batch = [Session(user_id=USER_ID, session_id=f"s{i}{j}", game_exe=f"g{i}{j}.exe", game_name=f"G{i}{j}",
                         started_at=1000, ended_at=4600, duration_sec=3600, label="tracked") for j in range(3)]
        mi.ensure_metadata(batch)
    assert len(calls) == 4  # budget, not 9


def test_refresh_ranks_shared_titles_and_caps_one_account(ddb_table, monkeypatch):
    import time
    from unittest.mock import MagicMock
    import handlers.refresh_metadata as refresh_module
    now = int(time.time())
    for i in range(30):  # one account floods made-up titles
        db_module.put_session(Session(user_id="flooder", session_id=f"f{i}", game_exe="x.exe",
                                      game_name=f"Junk {i}", started_at=now - 100, ended_at=now - 50,
                                      duration_sec=50, label="tracked"))
    for u in ("u1", "u2"):  # a real game two players report
        db_module.put_session(Session(user_id=u, session_id=f"r-{u}", game_exe="hades2.exe",
                                      game_name="Hades II", started_at=now - 100, ended_at=now - 50,
                                      duration_sec=50, label="tracked"))
    fetch = MagicMock(side_effect=lambda exe, name=None: _meta(exe, name, title=name))
    monkeypatch.setattr(refresh_module, "fetch_metadata", fetch)
    monkeypatch.setenv("PER_USER_NEW_PER_RUN", "5")
    refresh_module.handler({}, None)
    looked_up = [c.args for c in fetch.call_args_list]
    assert looked_up[0] == ("hades2.exe", "Hades II")  # shared title first
    assert sum(1 for exe, _ in looked_up if exe == "x.exe") == 5  # flood capped
