"""Steam importer and the import runner."""
import json
from unittest.mock import MagicMock

import pytest

import importer
from importers import steam

ACCOUNT = "12345678"
STEAMID64 = str(76561197960265728 + int(ACCOUNT))


@pytest.fixture
def steam_root(tmp_path):
    (tmp_path / "config").mkdir()
    (tmp_path / "config" / "loginusers.vdf").write_text(f'''"users"
{{
    "{STEAMID64}"
    {{
        "AccountName"   "me_login"
        "PersonaName"   "Rey"
        "MostRecent"    "1"
        "Timestamp"     "1790000000"
    }}
    "{76561197960265728 + 99}"
    {{
        "AccountName"   "sibling"
        "PersonaName"   "Sib"
        "MostRecent"    "0"
        "Timestamp"     "1700000000"
    }}
}}''', encoding="utf-8")
    cfg = tmp_path / "userdata" / ACCOUNT / "config"
    cfg.mkdir(parents=True)
    (cfg / "localconfig.vdf").write_text('''"UserLocalConfigStore"
{
    "Software" { "Valve" { "Steam" { "apps" {
        "1145360" { "LastPlayed" "1789000000" "Playtime" "600" "Playtime2wks" "30" }
        "413150"  { "LastPlayed" "1700000000" "Playtime" "1200" }
        "999"     { "LastPlayed" "0" "Playtime" "0" }
        "notanapp" { "Playtime" "50" }
    } } } }
}''', encoding="utf-8")
    apps = tmp_path / "steamapps"
    apps.mkdir()
    (apps / "appmanifest_1145360.acf").write_text('''"AppState"
{
    "appid"      "1145360"
    "name"       "Hades"
    "installdir" "Hades"
}''', encoding="utf-8")
    return tmp_path


# ── Steam ─────────────────────────────────────────────────────────────────

def test_parse_vdf_handles_nesting_and_escapes():
    data = steam.parse_vdf('"A" { "B" { "C" "say \\"hi\\"" } "D" "1" }')
    assert data == {"a": {"b": {"c": 'say "hi"'}, "d": "1"}}


def test_accounts_most_recent_first_with_counts(steam_root):
    accounts = steam.list_accounts(steam_root)
    assert [a["persona"] for a in accounts] == ["Rey", "Sib"]
    assert accounts[0]["account_id"] == ACCOUNT
    assert accounts[0]["games"] == 2 and accounts[0]["hours"] == 30.0


def test_playtime_skips_zero_and_non_apps(steam_root):
    games = {g["external_id"]: g for g in steam.read_playtime(ACCOUNT, steam_root)}
    assert set(games) == {"1145360", "413150"}
    assert games["1145360"]["minutes"] == 600 and games["1145360"]["last_played"] == 1789000000


def test_collect_names_installed_games_only(steam_root):
    names = {g["external_id"]: g["name"] for g in steam.collect(ACCOUNT, steam_root)}
    assert names == {"1145360": "Hades", "413150": ""}  # backend fills uninstalled titles


def test_read_playtime_rejects_odd_account_ids(steam_root):
    assert steam.read_playtime("../../etc", steam_root) == []


# ── runner ────────────────────────────────────────────────────────────────

@pytest.fixture
def runner(tmp_deckd, monkeypatch, steam_root):
    monkeypatch.setattr(importer, "_STATE_PATH", str(tmp_deckd / "import.json"))
    monkeypatch.setattr(steam, "_find_steam_install", lambda: steam_root)
    active = MagicMock(user_id="u1")
    monkeypatch.setattr(importer.token_store, "read", lambda: MagicMock(active_healthy=lambda: active))
    monkeypatch.setattr(importer, "get_id_token", lambda uid: "tok")
    put = MagicMock(return_value=MagicMock(status_code=200, json=lambda: {"import": {"count": 2, "total_hours": 30}}))
    monkeypatch.setattr(importer.requests, "put", put)
    return put


def test_run_uploads_full_list_for_selected_account(runner):
    result = importer.run_import()
    assert result["steam"] == {"ok": True, "count": 2, "hours": 30}
    url = runner.call_args.args[0]
    body = runner.call_args.kwargs["json"]
    assert url.endswith("/imports/steam")
    assert body["account_label"] == "Rey"
    assert {g["external_id"] for g in body["games"]} == {"1145360", "413150"}


def test_choosing_another_account(runner):
    importer.set_steam_account("99")
    assert importer.selected_steam_account() == "99"
    importer.run_import()
    assert runner.call_args.kwargs["json"]["games"] == []  # Sib has no localconfig here


def test_requested_reimport_runs_once(runner):
    assert importer.maybe_run_requested(None) is False
    assert importer.maybe_run_requested(1) is True
    assert importer.maybe_run_requested(1) is False  # already done
    assert runner.call_count == 1


def test_failed_request_is_retried_not_dropped(runner, monkeypatch):
    import time as _time
    req = int(_time.time()) - 10
    runner.return_value = MagicMock(status_code=500)
    assert importer.maybe_run_requested(req) is True
    assert importer.maybe_run_requested(req) is False  # inside the 5-minute backoff
    assert "handled_request_at" not in json.load(open(importer._STATE_PATH))
    monkeypatch.setattr(importer, "_RETRY_AFTER_FAILURE_SEC", 0)
    runner.return_value = MagicMock(status_code=200, json=lambda: {"import": {"count": 2, "total_hours": 30}})
    assert importer.maybe_run_requested(req) is True
    assert json.load(open(importer._STATE_PATH))["handled_request_at"] == req


def test_first_time_import_only_once(runner):
    assert importer.maybe_run_first_time() is True
    assert importer.maybe_run_first_time() is False


def test_failed_upload_is_reported_not_raised(runner):
    runner.return_value = MagicMock(status_code=500)
    assert importer.run_import()["steam"]["ok"] is False
    assert importer.maybe_run_first_time() is True  # still pending after a failure


def test_heartbeat_records_import_request(tmp_deckd, monkeypatch):
    import sync
    import token_store
    store = token_store.read()
    store.upsert(token_store.Account(user_id="u1", email="a@b.c", id_token="i",
                                     refresh_token="r", expires_at=2_000_000_000))
    store.set_active("u1")
    token_store.write(store)
    monkeypatch.setattr(sync, "get_id_token", lambda uid: "tok")
    monkeypatch.setattr(sync.requests, "post", MagicMock(return_value=MagicMock(
        status_code=200, json=lambda: {"device": {}, "import_requested_at": 1791000000})))
    assert sync.send_heartbeat() is True
    assert sync.import_requested_at() == 1791000000


# ── Steam connected on the web ────────────────────────────────────────────

def _link(monkeypatch, account_id=ACCOUNT, api_ok=True):
    import sync
    monkeypatch.setattr(sync, "_steam_link", {"account_id": account_id, "api_ok": api_ok})


def test_connected_account_is_used_and_synced_via_steam(runner, monkeypatch):
    _link(monkeypatch, api_ok=True)
    post = MagicMock(return_value=MagicMock(status_code=200, json=lambda: {"import": {"count": 40, "total_hours": 200}}))
    monkeypatch.setattr(importer.requests, "post", post)
    result = importer.run_import()["steam"]
    assert result == {"ok": True, "count": 40, "hours": 200, "via": "steam"}
    assert post.call_args.args[0].endswith("/steam/sync")
    runner.assert_not_called()  # no PC upload while the connection works


def test_private_profile_falls_back_to_linked_local_account(runner, monkeypatch):
    importer.set_steam_account("99")  # a stale manual choice must not win over the link
    _link(monkeypatch, api_ok=True)
    monkeypatch.setattr(importer.requests, "post", MagicMock(return_value=MagicMock(
        status_code=409, json=lambda: {"error": "steam_private"})))
    assert importer.run_import()["steam"]["ok"] is True
    assert runner.call_args.kwargs["json"]["account_label"] == "Rey"
    assert {g["external_id"] for g in runner.call_args.kwargs["json"]["games"]} == {"1145360", "413150"}


def test_linked_account_not_on_this_pc(runner, monkeypatch):
    _link(monkeypatch, account_id="55555", api_ok=False)
    result = importer.run_import()["steam"]
    assert result["ok"] is False and "hasn't been used on this PC" in result["error"]
    runner.assert_not_called()


def test_backend_saying_already_connected_counts_as_done(runner):
    runner.return_value = MagicMock(status_code=409)
    assert importer.run_import()["steam"] == {"ok": True, "via": "steam", "count": None}
