"""Unit tests for shared.rawg — RAWG API client."""
import time
from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest

import shared.rawg as rawg_module
from shared.rawg import fetch_metadata, _exe_to_name, _confident_match


# ---------------------------------------------------------------------------
# _exe_to_name
# ---------------------------------------------------------------------------

def test_exe_to_name_strips_exe():
    assert _exe_to_name("csgo.exe") == "Csgo"


def test_exe_to_name_replaces_underscores():
    assert _exe_to_name("dark_souls_3.exe") == "Dark Souls 3"


def test_exe_to_name_replaces_hyphens():
    assert _exe_to_name("halo-infinite.exe") == "Halo Infinite"


def test_exe_to_name_no_extension():
    assert _exe_to_name("witcher3") == "Witcher3"


# ---------------------------------------------------------------------------
# _confident_match
# ---------------------------------------------------------------------------

def test_confident_match_high_ratio():
    result = {"name": "Counter-Strike: Global Offensive", "slug": "counter-strike-global-offensive"}
    # "Csgo" vs "Counter-Strike: Global Offensive" — ratio below 0.60
    # but "csgo" not in slug either; expect False (low ratio match)
    assert _confident_match("csgo.exe", result) is False


def test_confident_match_slug_substring():
    result = {"name": "Halo Infinite", "slug": "halo-infinite"}
    # "halo-infinite" contains "halo" (stem of halo.exe) → True
    assert _confident_match("halo.exe", result) is True


def test_confident_match_close_name():
    result = {"name": "Witcher 3", "slug": "witcher-3"}
    # "Witcher3" vs "Witcher 3" — very close
    assert _confident_match("witcher3.exe", result) is True


def test_confident_match_fails_unrelated():
    result = {"name": "Minecraft", "slug": "minecraft"}
    assert _confident_match("csgo.exe", result) is False


# ---------------------------------------------------------------------------
# fetch_metadata — happy path
# ---------------------------------------------------------------------------

def _mock_search_resp(results: list) -> MagicMock:
    m = MagicMock()
    m.ok = True
    m.status_code = 200
    m.json.return_value = {"results": results}
    return m


def _mock_detail_resp(data: dict) -> MagicMock:
    m = MagicMock()
    m.ok = True
    m.status_code = 200
    m.json.return_value = data
    return m


@patch("shared.rawg.requests.get")
def test_fetch_metadata_happy_path(mock_get):
    search_resp = _mock_search_resp([
        {"id": 42, "name": "Witcher 3", "slug": "witcher-3"},
    ])
    detail_resp = _mock_detail_resp({
        "id": 42,
        "name": "Witcher 3",
        "slug": "witcher-3",
        "genres": [{"name": "RPG"}, {"name": "Action"}],
        "tags": [{"name": "Singleplayer"}, {"name": "Open World"}],
        "metacritic": 92,
        "released": "2015-05-19",
        "background_image": "https://example.com/img.jpg",
        "rating": 4.7,
    })
    mock_get.side_effect = [search_resp, detail_resp]

    result = fetch_metadata("witcher3.exe")

    assert result["resolution_failed"] is False
    assert result["rawg_id"] == 42
    assert result["name"] == "Witcher 3"
    assert "RPG" in result["genres"]
    assert result["metacritic"] == 92
    assert result["released"] == "2015-05-19"
    assert result["rating"] == Decimal("4.7")
    assert result["pk"] == "GAME#witcher3.exe"
    assert result["sk"] == "METADATA"
    assert result["gsi2pk"] == "GAME"
    assert result["game_exe"] == "witcher3.exe"


# ---------------------------------------------------------------------------
# fetch_metadata — empty results
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_empty_results(mock_get):
    mock_get.return_value = _mock_search_resp([])

    result = fetch_metadata("unknown.exe")

    assert result["resolution_failed"] is True
    assert result["rawg_id"] is None
    mock_get.assert_called_once()  # no detail call


# ---------------------------------------------------------------------------
# fetch_metadata — no confident match
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_no_confident_match(mock_get):
    mock_get.return_value = _mock_search_resp([
        {"id": 99, "name": "Minecraft", "slug": "minecraft"},
    ])

    result = fetch_metadata("csgo.exe")

    assert result["resolution_failed"] is True
    mock_get.assert_called_once()


# ---------------------------------------------------------------------------
# fetch_metadata — network error on search
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_network_error_search(mock_get):
    import requests as req_lib
    mock_get.side_effect = req_lib.RequestException("timeout")

    result = fetch_metadata("game.exe")

    assert result["resolution_failed"] is True


# ---------------------------------------------------------------------------
# fetch_metadata — network error on detail
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_network_error_detail(mock_get):
    import requests as req_lib
    search_resp = _mock_search_resp([
        {"id": 1, "name": "Witcher 3", "slug": "witcher-3"},
    ])
    mock_get.side_effect = [search_resp, req_lib.RequestException("timeout")]

    result = fetch_metadata("witcher3.exe")

    assert result["resolution_failed"] is True


# ---------------------------------------------------------------------------
# fetch_metadata — 429 rate limit
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_rate_limited(mock_get):
    m = MagicMock()
    m.ok = False
    m.status_code = 429
    mock_get.return_value = m

    result = fetch_metadata("game.exe")

    assert result["resolution_failed"] is True


# ---------------------------------------------------------------------------
# response parsing — tags capped at 15
# ---------------------------------------------------------------------------

@patch("shared.rawg.requests.get")
def test_fetch_metadata_tags_capped(mock_get):
    search_resp = _mock_search_resp([{"id": 1, "name": "Witcher 3", "slug": "witcher-3"}])
    tags = [{"name": f"Tag{i}"} for i in range(25)]
    detail_resp = _mock_detail_resp({
        "name": "Witcher 3", "slug": "witcher-3",
        "genres": [], "tags": tags,
        "metacritic": None, "released": None,
        "background_image": None, "rating": None,
    })
    mock_get.side_effect = [search_resp, detail_resp]

    result = fetch_metadata("witcher3.exe")

    assert len(result["tags"]) == 15
