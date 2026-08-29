import time
from shared.models import Session, UserProfile


def make_session(**kwargs) -> Session:
    defaults = dict(
        user_id="u1",
        session_id="s1",
        game_exe="game.exe",
        game_name="My Game",
        started_at=1_700_000_000,
        ended_at=1_700_003_600,
        duration_sec=3600,
        label="tracked",
    )
    defaults.update(kwargs)
    return Session(**defaults)


def test_session_round_trip():
    s = make_session()
    item = s.to_item()
    restored = Session.from_item(item)
    assert restored.user_id == s.user_id
    assert restored.session_id == s.session_id
    assert restored.game_exe == s.game_exe
    assert restored.game_name == s.game_name
    assert restored.started_at == s.started_at
    assert restored.ended_at == s.ended_at
    assert restored.duration_sec == s.duration_sec
    assert restored.label == s.label


def test_session_keys():
    s = make_session(user_id="u42", session_id="sid", started_at=1000)
    assert s.pk == "USER#u42"
    assert s.sk == "SESSION#1000#sid"
    assert s.gsi1pk == "GAME#game.exe"
    assert s.gsi1sk == "SESSION#1000"


def test_session_label_default():
    s = Session.from_item({
        "user_id": "u1", "session_id": "s1", "game_exe": "g.exe",
        "game_name": "G", "started_at": 1000, "ended_at": 2000,
        "duration_sec": 1000,
        # no label key
    })
    assert s.label == "tracked"


def test_user_profile_round_trip():
    p = UserProfile(user_id="u1", email="a@b.com", created_at=9999)
    item = p.to_item()
    assert item["pk"] == "USER#u1"
    assert item["sk"] == "PROFILE"
    assert item["email"] == "a@b.com"
    assert item["created_at"] == 9999


def test_user_profile_default_created_at():
    before = int(time.time())
    p = UserProfile(user_id="u1", email="a@b.com")
    after = int(time.time())
    assert before <= p.created_at <= after
