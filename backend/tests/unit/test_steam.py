"""Connect Steam: verified OpenID sign-in, Web API import, private fallback."""
import json
import time
from unittest.mock import MagicMock
from urllib.parse import parse_qs, urlparse

import pytest

import shared.imports as imports_module
import shared.steam_api as steam_api
from handlers.devices import handler as devices
from handlers.imports import handler as imports_handler
from handlers.steam import handler
from tests.unit.conftest import FakeLambdaContext, USER_ID, make_event

STEAMID = "76561198000000001"
ORIGIN = "http://localhost:5173"


@pytest.fixture(autouse=True)
def steam_env(monkeypatch):
    monkeypatch.setenv("STEAM_API_KEY", "test-steam-key")
    monkeypatch.setenv("WEB_ORIGINS", ORIGIN)


@pytest.fixture
def steam_web(monkeypatch):
    """Fake Steam: OpenID verification + Web API."""
    state = {"valid": True, "games": [
        {"appid": 1145360, "name": "Hades", "playtime_forever": 600, "rtime_last_played": 1789000000},
        {"appid": 413150, "name": "Stardew Valley", "playtime_forever": 0},
    ], "private": False}

    def post(url, data=None, timeout=None):
        assert url == steam_api.OPENID_LOGIN and data["openid.mode"] == "check_authentication"
        return MagicMock(ok=True, text="ns:http://specs.openid.net/auth/2.0\nis_valid:%s\n"
                         % ("true" if state["valid"] else "false"))

    def get(url, params=None, timeout=None):
        if "GetPlayerSummaries" in url:
            return MagicMock(ok=True, json=lambda: {"response": {"players": [{"personaname": "Rey"}]}})
        body = {"response": {}} if state["private"] else {"response": {"game_count": 2, "games": state["games"]}}
        return MagicMock(ok=True, status_code=200, json=lambda: body)

    monkeypatch.setattr(steam_api.requests, "post", post)
    monkeypatch.setattr(steam_api.requests, "get", get)
    return state


def _call(method, resource, body=None):
    resp = handler(make_event(method=method, resource=resource, body=body), FakeLambdaContext())
    return resp["statusCode"], json.loads(resp["body"])


def _connect():
    status, body = _call("POST", "/steam/connect", {"origin": ORIGIN})
    assert status == 200
    q = parse_qs(urlparse(body["url"]).query)
    return q["openid.return_to"][0]


def _assertion(return_to, steamid=STEAMID, **overrides):
    claimed = f"https://steamcommunity.com/openid/id/{steamid}"
    params = {
        "openid.ns": "http://specs.openid.net/auth/2.0",
        "openid.mode": "id_res",
        "openid.op_endpoint": steam_api.OPENID_LOGIN,
        "openid.claimed_id": claimed,
        "openid.identity": claimed,
        "openid.return_to": return_to,
        "openid.response_nonce": "2026-10-05T10:00:00Zabc",
        "openid.assoc_handle": "1234567890",
        "openid.signed": "signed,op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
        "openid.sig": "c2ln",
    }
    params.update(overrides)
    return params


# ── connect ──────────────────────────────────────────────────────────────

def test_connect_builds_steam_login_url_back_to_our_app(ddb_table):
    return_to = _connect()
    assert return_to.startswith(f"{ORIGIN}/settings/steam?state=")


@pytest.mark.parametrize("origin", ["https://evil.example", "http://localhost:5173/x", "", "javascript:alert(1)"])
def test_connect_refuses_other_origins(ddb_table, origin):
    status, body = _call("POST", "/steam/connect", {"origin": origin})
    assert status == 400 and body["error"] == "origin_not_allowed"


def test_not_configured_hides_feature(ddb_table, monkeypatch):
    monkeypatch.setenv("STEAM_API_KEY", "")
    assert _call("GET", "/steam")[1] == {"configured": False, "link": None}
    assert _call("POST", "/steam/connect", {"origin": ORIGIN})[0] == 503


# ── link (verification) ──────────────────────────────────────────────────

def test_link_verifies_saves_and_imports(ddb_table, steam_web):
    return_to = _connect()
    status, body = _call("POST", "/steam/link", {"params": _assertion(return_to)})
    assert status == 200
    assert body["link"]["steamid"] == STEAMID and body["link"]["name"] == "Rey"
    assert body["link"]["api_ok"] is True
    assert body["import"]["count"] == 1 and body["import"]["method"] == "steam_api"
    names = {i["name"] for i in imports_module.list_imported_games(USER_ID)}
    assert names == {"Hades"}  # 0-minute games are skipped


@pytest.mark.parametrize("tamper", [
    {"openid.return_to": f"{ORIGIN}/settings/steam?state=forged"},
    {"openid.identity": "https://steamcommunity.com/openid/id/76561198000000999"},
    {"openid.op_endpoint": "https://evil.example/openid/login"},
    {"openid.claimed_id": "https://evil.example/openid/id/76561198000000001"},
    {"openid.mode": "cancel"},
])
def test_link_rejects_tampered_assertions(ddb_table, steam_web, tamper):
    return_to = _connect()
    status, body = _call("POST", "/steam/link", {"params": _assertion(return_to, **tamper)})
    assert status == 400
    assert imports_module.get_steam_link(USER_ID) is None


def test_link_rejects_when_steam_says_invalid(ddb_table, steam_web):
    steam_web["valid"] = False
    return_to = _connect()
    assert _call("POST", "/steam/link", {"params": _assertion(return_to)})[0] == 400


def test_sign_in_is_single_use(ddb_table, steam_web):
    return_to = _connect()
    assert _call("POST", "/steam/link", {"params": _assertion(return_to)})[0] == 200
    status, body = _call("POST", "/steam/link", {"params": _assertion(return_to)})
    assert status == 400 and body["error"] == "sign_in_expired"


def test_sign_in_expires(ddb_table, steam_web, monkeypatch):
    return_to = _connect()
    real = time.time
    monkeypatch.setattr(imports_module.time, "time", lambda: real() + 3600)
    assert _call("POST", "/steam/link", {"params": _assertion(return_to)})[1]["error"] == "sign_in_expired"


# ── sync + private fallback ──────────────────────────────────────────────

def test_private_profile_falls_back_to_pc(ddb_table, steam_web):
    steam_web["private"] = True
    return_to = _connect()
    status, body = _call("POST", "/steam/link", {"params": _assertion(return_to)})
    assert status == 200 and body["error"] == "steam_private"  # connected, library hidden
    assert imports_module.get_import_request(USER_ID) is not None  # PC asked to import
    # The tracker's local upload is now accepted.
    put = imports_handler(make_event(method="PUT", path_params={"source": "steam"}, resource="/imports/{source}",
                                     body={"games": [{"external_id": "1145360", "name": "Hades", "minutes": 5}]}),
                          FakeLambdaContext())
    assert put["statusCode"] == 200


def test_pc_upload_refused_while_connection_works(ddb_table, steam_web):
    _call("POST", "/steam/link", {"params": _assertion(_connect())})
    put = imports_handler(make_event(method="PUT", path_params={"source": "steam"}, resource="/imports/{source}",
                                     body={"games": []}), FakeLambdaContext())
    assert put["statusCode"] == 409
    assert len(imports_module.list_imported_games(USER_ID)) == 1  # API import kept


def test_resync_overwrites(ddb_table, steam_web):
    _call("POST", "/steam/link", {"params": _assertion(_connect())})
    steam_web["games"] = [{"appid": 413150, "name": "Stardew Valley", "playtime_forever": 90}]
    status, body = _call("POST", "/steam/sync")
    assert status == 200
    assert {i["name"] for i in imports_module.list_imported_games(USER_ID)} == {"Stardew Valley"}


def test_heartbeat_tells_tracker_which_account(ddb_table, steam_web):
    _call("POST", "/steam/link", {"params": _assertion(_connect())})
    hb = devices(make_event(method="POST", resource="/devices/heartbeat",
                            headers={"X-Device-Id": "pc-1", "X-Device-Name": "PC"}), FakeLambdaContext())
    steam = json.loads(hb["body"])["steam"]
    assert steam == {"account_id": str(int(STEAMID) - steam_api.STEAMID64_BASE), "api_ok": True}


def test_disconnect_keeps_imported_data(ddb_table, steam_web):
    _call("POST", "/steam/link", {"params": _assertion(_connect())})
    assert _call("DELETE", "/steam/link")[0] == 200
    assert imports_module.get_steam_link(USER_ID) is None
    assert len(imports_module.list_imported_games(USER_ID)) == 1


def test_successful_sync_clears_a_pending_pc_request(ddb_table, steam_web):
    steam_web["private"] = True
    _call("POST", "/steam/link", {"params": _assertion(_connect())})
    assert imports_module.get_import_request(USER_ID) is not None
    steam_web["private"] = False  # user made game details public
    assert _call("POST", "/steam/sync")[0] == 200
    assert imports_module.get_import_request(USER_ID) is None
