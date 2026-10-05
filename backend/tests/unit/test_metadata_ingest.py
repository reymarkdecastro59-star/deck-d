"""Art is looked up on a new game's first upload, by its reported title."""
from unittest.mock import MagicMock

import shared.metadata_ingest as mi
from shared import db as db_module
from shared.models import Session


def _s(exe, name, sid):
    return Session(user_id="u1", session_id=sid, game_exe=exe, game_name=name,
                   started_at=1000, ended_at=4600, duration_sec=3600)


def _good(exe, name=None):
    return {"pk": f"GAME#{exe}", "sk": "METADATA", "gsi2pk": "GAME", "gsi2sk": "1",
            "game_exe": exe, "rawg_id": 7, "name": name, "background_image": "https://x/y.jpg",
            "fetched_at": 1, "resolution_failed": False}


def test_looks_up_unseen_exe_with_title(ddb_table, monkeypatch):
    fetch = MagicMock(side_effect=_good)
    monkeypatch.setattr(mi, "fetch_metadata", fetch)
    assert mi.ensure_metadata([_s("Lurk.exe", "Lurk in the Dark : Prologue", "s1")]) == 1
    fetch.assert_called_once_with("lurk.exe", "Lurk in the Dark : Prologue")
    assert db_module.get_game_metadata("lurk.exe")["rawg_id"] == 7


def test_skips_known_exes_and_caps_lookups(ddb_table, monkeypatch):
    db_module.put_game_metadata(_good("known.exe"))
    fetch = MagicMock(side_effect=_good)
    monkeypatch.setattr(mi, "fetch_metadata", fetch)
    sessions = [_s("known.exe", "Known", "k")] + [_s(f"g{i}.exe", f"G{i}", f"s{i}") for i in range(6)]
    assert mi.ensure_metadata(sessions) == mi.MAX_LOOKUPS_PER_REQUEST
    assert all(c.args[0] != "known.exe" for c in fetch.call_args_list)


def test_never_raises(ddb_table, monkeypatch):
    monkeypatch.setattr(mi, "fetch_metadata", MagicMock(side_effect=RuntimeError("rawg down")))
    assert mi.ensure_metadata([_s("a.exe", "A", "s1")]) == 0
