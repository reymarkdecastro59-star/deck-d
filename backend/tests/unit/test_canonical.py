"""Tests for canonical game grouping (Phase 7)."""
from shared.canonical import build_display, canonical_key, unique_exes
from shared.models import Session


def _sess(exe: str, name: str, started_at: int = 1_700_000_000) -> Session:
    return Session(
        user_id="u",
        session_id=f"s-{exe}-{started_at}",
        game_exe=exe,
        game_name=name,
        started_at=started_at,
        ended_at=started_at + 3600,
        duration_sec=3600,
    )


def _meta(exe: str, rawg_id: int | None, name: str = "", slug: str = "",
          bg: str = "", failed: bool = False) -> dict:
    return {
        "game_exe": exe,
        "rawg_id": rawg_id,
        "name": name,
        "slug": slug,
        "background_image": bg,
        "resolution_failed": failed,
    }


# ---------- canonical_key ---------------------------------------------------

def test_key_uses_rawg_id_when_resolved():
    """The whole point of Phase 7: two rows for the same game via different
    launchers merge because RAWG resolved them to the same rawg_id."""
    steam = _sess("phasmo.exe", "Phasmophobia (Steam)")
    epic = _sess("phasmophobia.exe", "Phasmophobia")
    meta = {
        "phasmo.exe": _meta("phasmo.exe", 42, name="Phasmophobia", slug="phasmophobia"),
        "phasmophobia.exe": _meta("phasmophobia.exe", 42, name="Phasmophobia", slug="phasmophobia"),
    }
    assert canonical_key(steam, meta) == canonical_key(epic, meta) == "rawg:42"


def test_key_falls_back_to_exe_when_metadata_absent():
    """No RAWG entry for this exe → group by exe (never by name — same
    exe with different names would then split arbitrarily)."""
    s = _sess("game.exe", "Game")
    assert canonical_key(s, {}) == "exe:game.exe"


def test_key_falls_back_to_exe_when_resolution_failed():
    """The cache tried and failed — treat as unresolved and use exe."""
    s = _sess("obscure.exe", "Obscure")
    meta = {"obscure.exe": _meta("obscure.exe", None, failed=True)}
    assert canonical_key(s, meta) == "exe:obscure.exe"


def test_key_falls_back_to_name_when_exe_missing():
    """Legacy/corrupted rows with no game_exe — last resort is name."""
    s = _sess("", "MysteryGame")
    assert canonical_key(s, {}) == "name:MysteryGame"


def test_key_is_case_insensitive_on_exe():
    """Windows path-case shouldn't split the group."""
    a = _sess("Game.EXE", "Game")
    b = _sess("game.exe", "Game")
    assert canonical_key(a, {}) == canonical_key(b, {}) == "exe:game.exe"


# ---------- build_display ---------------------------------------------------

def test_display_from_rawg_prefers_metadata_name():
    """When rawg_id resolved, use the RAWG canonical name (not the local
    game_name which might be "Phasmophobia (Steam)")."""
    s = _sess("phasmo.exe", "Phasmophobia (Steam)")
    meta = {"phasmo.exe": _meta(
        "phasmo.exe", 42, name="Phasmophobia", slug="phasmophobia",
        bg="https://media.rawg.io/phasmo.jpg",
    )}
    disp = build_display("rawg:42", [s], meta)
    assert disp == {
        "game": "Phasmophobia",
        "rawg_id": 42,
        "slug": "phasmophobia",
        "background_image": "https://media.rawg.io/phasmo.jpg",
    }


def test_display_from_exe_uses_mode_of_local_names():
    """When we fell back to exe grouping, no RAWG name is available. The
    display name is the mode of the local game_names — stable even when
    users disagree on capitalisation."""
    sessions = [
        _sess("game.exe", "My Game", 1_700_000_000),
        _sess("game.exe", "My Game", 1_700_010_000),
        _sess("game.exe", "my game", 1_700_020_000),  # minority spelling
    ]
    disp = build_display("exe:game.exe", sessions, {})
    assert disp["game"] == "My Game"
    assert disp["rawg_id"] is None
    assert disp["slug"] is None
    assert disp["background_image"] is None


def test_display_from_name_key_carries_through():
    s = _sess("", "MysteryGame")
    disp = build_display("name:MysteryGame", [s], {})
    assert disp["game"] == "MysteryGame"
    assert disp["rawg_id"] is None


# ---------- unique_exes -----------------------------------------------------

def test_unique_exes_returns_sorted_lowercased_distinct():
    sessions = [
        _sess("Game.EXE", "G"),
        _sess("game.exe", "G"),  # duplicate after lowercase
        _sess("other.exe", "O"),
    ]
    assert unique_exes(sessions) == ["game.exe", "other.exe"]


def test_unique_exes_skips_empty():
    """Legacy rows with no exe don't contribute a stray "" to the batch."""
    sessions = [_sess("", "A"), _sess("real.exe", "R")]
    assert unique_exes(sessions) == ["real.exe"]


def test_unique_exes_empty_list():
    assert unique_exes([]) == []
