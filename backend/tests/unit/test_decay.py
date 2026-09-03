import math

from shared.decay import HALF_LIFE_DAYS, HALF_LIFE_SEC, weight, decay_sec, decay_sec_by_game
from shared.models import Session


def _sess(game_name: str, started_at: int, duration_sec: int = 3600) -> Session:
    return Session(
        user_id="u",
        session_id=f"s-{started_at}",
        game_exe=f"{game_name}.exe",
        game_name=game_name,
        started_at=started_at,
        ended_at=started_at + duration_sec,
        duration_sec=duration_sec,
    )


def test_half_life_constant_is_14_days():
    assert HALF_LIFE_DAYS == 14
    assert HALF_LIFE_SEC == 14 * 86_400


def test_weight_now_is_one():
    assert weight(0) == 1.0
    assert weight(-100) == 1.0  # future sessions clamp to full weight


def test_weight_at_half_life_is_half():
    assert weight(HALF_LIFE_SEC) == 0.5


def test_weight_at_two_half_lives_is_quarter():
    assert math.isclose(weight(HALF_LIFE_SEC * 2), 0.25)


def test_weight_at_three_half_lives_is_eighth():
    assert math.isclose(weight(HALF_LIFE_SEC * 3), 0.125)


def test_weight_is_monotonically_decreasing():
    assert weight(HALF_LIFE_SEC // 2) > weight(HALF_LIFE_SEC)
    assert weight(HALF_LIFE_SEC) > weight(HALF_LIFE_SEC * 2)


def test_decay_sec_single_session_now():
    now = 1_000_000
    total = decay_sec([_sess("A", now, 3600)], now)
    assert math.isclose(total, 3600.0)


def test_decay_sec_single_session_at_half_life():
    now = 1_000_000 + HALF_LIFE_SEC
    total = decay_sec([_sess("A", 1_000_000, 3600)], now)
    assert math.isclose(total, 1800.0)


def test_decay_sec_by_game_groups_and_weights():
    now = 2_000_000
    sessions = [
        _sess("A", now, 3600),                       # full weight
        _sess("A", now - HALF_LIFE_SEC, 3600),       # half weight
        _sess("B", now, 3600),                       # full weight
    ]
    by_game = decay_sec_by_game(sessions, now)
    assert math.isclose(by_game["A"], 3600 + 1800)
    assert math.isclose(by_game["B"], 3600)


def test_decay_sec_empty_is_zero():
    assert decay_sec([], 1_000_000) == 0.0
    assert decay_sec_by_game([], 1_000_000) == {}
