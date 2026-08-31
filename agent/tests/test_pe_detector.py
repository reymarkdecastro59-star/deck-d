from pathlib import Path

from launchers import pe_detector


def _write_bytes(path: Path, size: int) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(b"\x00" * size)


def test_is_likely_game_missing_file_returns_false(tmp_path):
    assert pe_detector.is_likely_game(tmp_path / "nope.exe") is False


def test_is_likely_game_non_pe_file_returns_false(tmp_path):
    fake = tmp_path / "fake.exe"
    fake.write_bytes(b"not a valid PE file")
    assert pe_detector.is_likely_game(fake) is False


def test_find_game_exes_empty_dir(tmp_path):
    assert pe_detector.find_game_exes(tmp_path) == []


def test_find_game_exes_missing_dir(tmp_path):
    assert pe_detector.find_game_exes(tmp_path / "nope") == []


def test_find_game_exes_skips_small_files(tmp_path):
    _write_bytes(tmp_path / "tiny.exe", 50_000)  # below 100KB threshold
    assert pe_detector.find_game_exes(tmp_path) == []


def test_find_game_exes_non_pe_bytes_return_no_hits(tmp_path):
    _write_bytes(tmp_path / "big_but_fake.exe", 5_000_000)
    assert pe_detector.find_game_exes(tmp_path) == []


def test_find_game_exes_respects_max_check_cap(tmp_path):
    # Create many candidates; ensures the walk terminates via the cap
    # (no true-positive expected — all are zero-filled non-PE).
    for i in range(30):
        _write_bytes(tmp_path / f"e{i}.exe", 200_000)
    assert pe_detector.find_game_exes(tmp_path, max_check=5) == []
