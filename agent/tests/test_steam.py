from pathlib import Path

from launchers import steam


VDF_FIXTURE = '''"libraryfolders"
{
    "0"
    {
        "path"        "C:\\\\Program Files (x86)\\\\Steam"
    }
    "1"
    {
        "path"        "D:\\\\SteamLibrary"
    }
}
'''

ACF_FIXTURE = '''"AppState"
{
    "appid"        "12345"
    "name"        "Example Game"
    "installdir"    "Example Game"
    "LastUpdated"    "1700000000"
}
'''


def _write_exe(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\x00" * size)


def test_parse_library_folders_extracts_paths(tmp_path):
    vdf = tmp_path / "libraryfolders.vdf"
    vdf.write_text(VDF_FIXTURE, encoding="utf-8")
    paths = steam.parse_library_folders(vdf)
    assert Path(r"C:\Program Files (x86)\Steam") in paths
    assert Path(r"D:\SteamLibrary") in paths
    assert len(paths) == 2


def test_parse_library_folders_missing_file_returns_empty(tmp_path):
    assert steam.parse_library_folders(tmp_path / "nope.vdf") == []


def test_parse_appmanifest_extracts_name_and_installdir(tmp_path):
    acf = tmp_path / "appmanifest_12345.acf"
    acf.write_text(ACF_FIXTURE, encoding="utf-8")
    assert steam.parse_appmanifest(acf) == ("Example Game", "Example Game")


def test_parse_appmanifest_missing_fields_returns_none(tmp_path):
    acf = tmp_path / "appmanifest_bad.acf"
    acf.write_text('"AppState" { "appid" "9" }', encoding="utf-8")
    assert steam.parse_appmanifest(acf) is None


def test_parse_appmanifest_missing_file_returns_none(tmp_path):
    assert steam.parse_appmanifest(tmp_path / "nope.acf") is None


def test_find_game_exe_returns_largest_valid_exe(tmp_path):
    game_dir = tmp_path / "Some Game"
    _write_exe(game_dir / "Launcher.exe", 200_000)
    _write_exe(game_dir / "MainGame.exe", 5_000_000)
    assert steam.find_game_exe(game_dir) == "MainGame.exe"


def test_find_game_exe_ignores_blacklisted_and_small(tmp_path):
    game_dir = tmp_path / "Some Game"
    _write_exe(game_dir / "unins000.exe", 5_000_000)   # blacklisted name
    _write_exe(game_dir / "tiny.exe", 50_000)          # below 100KB threshold
    _write_exe(game_dir / "RealGame.exe", 300_000)
    assert steam.find_game_exe(game_dir) == "RealGame.exe"


def test_find_game_exe_prefers_dir_name_match(tmp_path):
    game_dir = tmp_path / "Cyberpunk 2077"
    _write_exe(game_dir / "WebHelper.exe", 10_000_000)      # bigger but wrong
    _write_exe(game_dir / "Cyberpunk2077.exe", 3_000_000)   # matches dir slug
    assert steam.find_game_exe(game_dir) == "Cyberpunk2077.exe"


def test_find_game_exe_missing_dir_returns_none(tmp_path):
    assert steam.find_game_exe(tmp_path / "nope") is None
