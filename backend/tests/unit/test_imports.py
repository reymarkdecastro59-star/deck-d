"""Launcher imports: re-import overwrites (never adds), tracked play is never
touched, and dashboard totals take the larger of tracked/imported per game."""
import json
import time

import pytest

import shared.db as db_module
import shared.imports as imports_module
from handlers.dashboard import handler as dashboard
from handlers.devices import handler as devices
from handlers.imports import handler
from shared.models import Session
from tests.unit.conftest import FakeLambdaContext, USER_ID, make_event


@pytest.fixture(autouse=True)
def _no_steam_network(monkeypatch):
    names = {"1145360": "Hades", "413150": "Stardew Valley"}
    monkeypatch.setattr(imports_module, "_fetch_steam_name", lambda appid: names.get(appid))


def _put(games, source="steam", account_label="me"):
    event = make_event(method="PUT", path_params={"source": source}, resource="/imports/{source}",
                       body={"account_label": account_label, "games": games})
    return handler(event, FakeLambdaContext())


def _body(resp):
    return json.loads(resp["body"])


def _imported_ids(source="steam"):
    return sorted(i["external_id"] for i in imports_module.list_imported_games(USER_ID)
                  if i["source"] == source)


def _session(name, minutes, sid, started_at=None):
    started_at = started_at or int(time.time()) - 10_000
    db_module.put_session(Session(
        user_id=USER_ID, session_id=sid, game_exe=f"{name}.exe", game_name=name,
        started_at=started_at, ended_at=started_at + minutes * 60, duration_sec=minutes * 60,
        label="tracked",
    ))


# ── overwrite semantics ──────────────────────────────────────────────────────

def test_import_stores_games_and_summary(ddb_table):
    resp = _put([{"external_id": "1145360", "name": "Hades", "minutes": 600}])
    assert resp["statusCode"] == 200
    assert _body(resp)["import"]["count"] == 1
    assert _body(resp)["import"]["total_hours"] == 10.0


def test_reimport_replaces_instead_of_adding(ddb_table):
    _put([{"external_id": "1", "name": "A", "minutes": 60},
          {"external_id": "2", "name": "B", "minutes": 60}])
    _put([{"external_id": "2", "name": "B", "minutes": 120},
          {"external_id": "3", "name": "C", "minutes": 30}])
    assert _imported_ids() == ["2", "3"]  # "1" removed, nothing duplicated
    b = next(i for i in imports_module.list_imported_games(USER_ID) if i["external_id"] == "2")
    assert int(b["minutes"]) == 120  # overwritten, not summed
    summaries = imports_module.list_import_summaries(USER_ID)
    assert len(summaries) == 1 and int(summaries[0]["count"]) == 2


def test_reimport_never_touches_tracked_sessions(ddb_table):
    _session("Hades", 90, "s1")
    _put([{"external_id": "1145360", "name": "Hades", "minutes": 600}])
    _put([])  # re-import with an empty library
    assert [s.session_id for s in db_module.iter_all_sessions(USER_ID)] == ["s1"]


def test_only_steam_is_accepted(ddb_table):
    assert _put([{"external_id": "gog_9", "name": "G", "minutes": 60}], source="gog_galaxy")["statusCode"] == 404


def test_delete_removes_one_source(ddb_table):
    _session("A", 30, "s1")
    _put([{"external_id": "1", "name": "A", "minutes": 60}])
    resp = handler(make_event(method="DELETE", path_params={"source": "steam"},
                              resource="/imports/{source}"), FakeLambdaContext())
    assert _body(resp)["removed"] == 1
    assert imports_module.list_imported_games(USER_ID) == []
    assert imports_module.list_import_summaries(USER_ID) == []
    assert len(db_module.iter_all_sessions(USER_ID)) == 1


def test_imports_are_per_user(ddb_table):
    _put([{"external_id": "1", "name": "A", "minutes": 60}])
    assert imports_module.list_imported_games("someone-else") == []


# ── steam titles ─────────────────────────────────────────────────────────────

def test_steam_titles_filled_for_uninstalled_games(ddb_table):
    _put([{"external_id": "413150", "name": "", "minutes": 60},
          {"external_id": "999", "name": "", "minutes": 5}])
    names = {i["external_id"]: i["name"] for i in imports_module.list_imported_games(USER_ID)}
    assert names == {"413150": "Stardew Valley", "999": "Steam app 999"}


# ── validation ───────────────────────────────────────────────────────────────

@pytest.mark.parametrize("game", [
    {"external_id": "bad id!", "name": "X", "minutes": 1},
    {"external_id": "1", "name": "X", "minutes": -5},
    {"external_id": "1", "name": "X", "minutes": 1, "unexpected": True},
    {"external_id": "1", "name": "X" * 201, "minutes": 1},
    {"external_id": "1", "name": "X", "minutes": 1, "last_played": 4_000_000_000},
])
def test_rejects_bad_games(ddb_table, game):
    assert _put([game])["statusCode"] == 400


def test_rejects_duplicate_ids_and_unknown_source(ddb_table):
    dup = [{"external_id": "1", "name": "A", "minutes": 1}] * 2
    assert _put(dup)["statusCode"] == 400
    assert _put([], source="itch")["statusCode"] == 404


# ── dashboard combination ────────────────────────────────────────────────────

def _dashboard(**qp):
    return _body(dashboard(make_event(method="GET", query_params=qp or None), FakeLambdaContext()))


def test_dashboard_uses_max_not_sum(ddb_table):
    _session("Hades", 90, "s1")  # 1.5 h tracked
    _put([{"external_id": "1145360", "name": "Hades", "minutes": 600}])  # 10 h on Steam
    body = _dashboard()
    hades = next(g for g in body["games"] if g["game"] == "Hades")
    assert hades["total_hours"] == 10.0
    assert hades["tracked_hours"] == 1.5
    assert hades["imported_hours"] == 10.0
    assert body["total_hours"] == 10.0
    assert body["tracked_hours"] == 1.5
    assert body["total_sessions"] == 1


def test_tracked_wins_when_it_is_larger(ddb_table):
    _session("Hades", 120, "s1")
    _put([{"external_id": "1145360", "name": "Hades", "minutes": 30}])
    hades = next(g for g in _dashboard()["games"] if g["game"] == "Hades")
    assert hades["total_hours"] == 2.0


def test_imported_only_games_get_rows_and_steam_art(ddb_table):
    _session("Hades", 60, "s1")
    _put([{"external_id": "413150", "name": "Stardew Valley", "minutes": 1200}])
    games = _dashboard()["games"]
    stardew = next(g for g in games if g["game"] == "Stardew Valley")
    assert stardew["total_hours"] == 20.0 and stardew["decay_hours"] == 0
    assert stardew["background_image"].endswith("/413150/header.jpg")
    assert games[0]["game"] == "Hades"  # tracked rows (momentum) stay first


def test_title_match_ignores_punctuation(ddb_table):
    _session("Lurk in the Dark : Prologue", 60, "s1")
    _put([{"external_id": "5", "name": "Lurk in the Dark: Prologue", "minutes": 600}])
    games = _dashboard()["games"]
    assert len(games) == 1 and games[0]["total_hours"] == 10.0


def test_range_queries_ignore_imports(ddb_table):
    now = int(time.time())
    _session("Hades", 60, "s1", started_at=now - 3600)
    _put([{"external_id": "1145360", "name": "Hades", "minutes": 6000}])
    body = _dashboard(**{"from": str(now - 86_400), "to": str(now)})
    assert body["total_hours"] == 1.0


# ── re-import request reaches the tracker ────────────────────────────────────

def test_request_shows_on_heartbeat_and_clears_after_import(ddb_table):
    resp = handler(make_event(method="POST", resource="/imports/request"), FakeLambdaContext())
    assert resp["statusCode"] == 202
    hb = devices(make_event(method="POST", resource="/devices/heartbeat",
                            headers={"X-Device-Id": "pc-1", "X-Device-Name": "PC"}), FakeLambdaContext())
    assert _body(hb)["import_requested_at"] is not None
    _put([{"external_id": "1", "name": "A", "minutes": 1}])
    listing = _body(handler(make_event(method="GET", resource="/imports"), FakeLambdaContext()))
    assert listing["requested_at"] is None
    assert listing["imports"][0]["source"] == "steam"


def test_steam_ids_must_be_numeric(ddb_table):
    resp = _put([{"external_id": "abc", "name": "", "minutes": 5}], source="steam")
    assert resp["statusCode"] == 400
    assert _put([{"external_id": "413150", "name": "", "minutes": 5}])["statusCode"] == 200


def test_imported_hours_counted_once_across_same_title_rows(ddb_table):
    from shared.imports import merge_into_dashboard
    rows = [{"game": "Hades", "total_sec": 3600, "total_hours": 1.0, "decay_hours": 1.0},
            {"game": "Hades", "total_sec": 3600, "total_hours": 1.0, "decay_hours": 0.5}]
    imported = [{"source": "steam", "external_id": "1", "name": "Hades", "minutes": 600}]
    merged, extra = merge_into_dashboard(rows, imported)
    assert extra == 8.0  # 10 h on Steam minus 2 h tracked, once
    assert sum(r["total_hours"] for r in merged) == 10.0
