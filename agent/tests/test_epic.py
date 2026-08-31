import json
from pathlib import Path

from launchers import epic


def _write_manifest(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data), encoding="utf-8")


def test_parse_manifest_extracts_exe_basename_and_name(tmp_path):
    item = tmp_path / "12345.item"
    _write_manifest(item, {
        "DisplayName": "Example Game",
        "LaunchExecutable": "Binaries/Win64/ExampleGame.exe",
        "AppCategories": ["games"],
    })
    assert epic.parse_manifest(item) == ("ExampleGame.exe", "Example Game")


def test_parse_manifest_accepts_missing_categories(tmp_path):
    item = tmp_path / "no_cat.item"
    _write_manifest(item, {
        "DisplayName": "Plain",
        "LaunchExecutable": "Plain.exe",
    })
    assert epic.parse_manifest(item) == ("Plain.exe", "Plain")


def test_parse_manifest_filters_non_exe(tmp_path):
    item = tmp_path / "9.item"
    _write_manifest(item, {
        "DisplayName": "Plugin",
        "LaunchExecutable": "plugin.dll",
    })
    assert epic.parse_manifest(item) is None


def test_parse_manifest_filters_non_game_category(tmp_path):
    item = tmp_path / "9.item"
    _write_manifest(item, {
        "DisplayName": "Unreal Engine",
        "LaunchExecutable": "Engine.exe",
        "AppCategories": ["engines"],
    })
    assert epic.parse_manifest(item) is None


def test_parse_manifest_missing_fields_returns_none(tmp_path):
    item = tmp_path / "9.item"
    _write_manifest(item, {"DisplayName": "No exe field"})
    assert epic.parse_manifest(item) is None


def test_parse_manifest_missing_file_returns_none(tmp_path):
    assert epic.parse_manifest(tmp_path / "nope.item") is None


def test_parse_manifest_invalid_json_returns_none(tmp_path):
    item = tmp_path / "bad.item"
    item.write_text("not-json", encoding="utf-8")
    assert epic.parse_manifest(item) is None


def test_get_installed_games_aggregates_manifests(tmp_path):
    _write_manifest(tmp_path / "1.item", {
        "DisplayName": "Alpha",
        "LaunchExecutable": "AlphaGame.exe",
        "AppCategories": ["games"],
    })
    _write_manifest(tmp_path / "2.item", {
        "DisplayName": "Beta",
        "LaunchExecutable": "sub/Beta.exe",
        "AppCategories": ["games"],
    })
    assert epic.get_installed_games(manifests_dir=tmp_path) == {
        "AlphaGame.exe": "Alpha",
        "Beta.exe": "Beta",
    }


def test_get_installed_games_missing_dir_returns_empty(tmp_path):
    assert epic.get_installed_games(manifests_dir=tmp_path / "nope") == {}
