import json
import time
import pytest
import shared.db as db_module
from shared.decay import HALF_LIFE_SEC
from shared.models import Session
from handlers.dashboard import handler
from tests.unit.conftest import make_event, USER_ID, FakeLambdaContext


def _seed(game_name: str, duration_sec: int, session_id: str, started_at: int):
    s = Session(
        user_id=USER_ID,
        session_id=session_id,
        game_exe=f"{game_name}.exe",
        game_name=game_name,
        started_at=started_at,
        ended_at=started_at + duration_sec,
        duration_sec=duration_sec,
        label="tracked",
    )
    db_module.put_session(s)


def test_dashboard_aggregation(ddb_table):
    # Seed relative to now so decay weights stay in a meaningful range as the
    # suite ages. Fixed epochs (e.g. 1_700_000_000) put sessions ~70 half-lives
    # in the past, collapsing all decay values to ~0 and making ordering rely
    # on dict-insertion luck.
    now = int(time.time())
    _seed("Minecraft", 3600, "s1", now - 3 * 86400)   # 3 days ago
    _seed("Minecraft", 1800, "s2", now - 2 * 86400)   # 2 days ago
    _seed("Valorant", 7200, "s3", now - 1 * 86400)    # 1 day ago (newest, largest)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 3
    assert body["total_hours"] == round((3600 + 1800 + 7200) / 3600, 2)
    assert body["half_life_days"] == 14
    assert body["decay_hours"] <= body["total_hours"]  # decay never exceeds raw
    assert body["decay_hours"] > 0  # sessions are recent enough to matter

    games_by_name = {g["game"]: g for g in body["games"]}
    assert "Minecraft" in games_by_name
    assert "Valorant" in games_by_name
    assert games_by_name["Minecraft"]["total_sec"] == 5400
    assert games_by_name["Valorant"]["total_sec"] == 7200
    for g in body["games"]:
        assert "decay_sec" in g and "decay_hours" in g
        assert g["decay_sec"] <= g["total_sec"]
        # decay_hours must be derived from the same underlying decay_sec —
        # rounding both from the raw float should keep them consistent.
        assert g["decay_hours"] == round(g["decay_sec"] / 3600, 2)

    # Valorant is both the largest single session AND the newest,
    # so it should rank first under decay ordering.
    assert body["games"][0]["game"] == "Valorant"


def test_dashboard_decay_ranks_recent_over_old(ddb_table):
    """Older/larger game should lose the #1 slot to a newer/smaller game once decay dominates."""
    now = int(time.time())
    # Ancient game with lots of playtime (5x half-life ago → ~3% weight)
    _seed("AncientRPG", 10 * 3600, "old", now - HALF_LIFE_SEC * 5)
    # Recent game with modest playtime (played "now" → 100% weight)
    _seed("NewShooter", 1 * 3600, "new", now - 60)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    body = json.loads(resp["body"])

    # Raw hours: AncientRPG wins (10 > 1). Decay: NewShooter wins (1 * ~1.0 > 10 * ~0.03).
    games_by_name = {g["game"]: g for g in body["games"]}
    assert games_by_name["AncientRPG"]["total_sec"] > games_by_name["NewShooter"]["total_sec"]
    assert games_by_name["NewShooter"]["decay_sec"] > games_by_name["AncientRPG"]["decay_sec"]
    assert body["games"][0]["game"] == "NewShooter"


def test_dashboard_future_dated_session_logs_warning(ddb_table, caplog):
    """Clock skew produces started_at > now; weight clamps to 1.0 (correct)
    but the handler must surface a warning so ops sees the invariant break."""
    import logging
    now = int(time.time())
    _seed("SkewedGame", 3600, "future", now + 3600)   # 1h in the future

    with caplog.at_level(logging.WARNING):
        resp = handler(make_event(method="GET"), FakeLambdaContext())

    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    # decay_sec > total_sec is impossible with real data but expected here due
    # to the clamp — that's why the warning matters.
    assert body["games"][0]["decay_sec"] >= body["games"][0]["total_sec"]
    assert any("future_dated_sessions" in r.message for r in caplog.records)


def test_dashboard_empty(ddb_table):
    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])
    assert body["total_sessions"] == 0
    assert body["total_hours"] == 0.0
    assert body["games"] == []
    # New fields must be present in the empty case so clients that always
    # read them don't crash on first load with no sessions.
    assert body["decay_hours"] == 0.0
    assert body["half_life_days"] == 14


# ---------------------------------------------------------------------------
# Time-range filtering tests
# ---------------------------------------------------------------------------

def test_dashboard_time_range_filters(ddb_table):
    _seed("Minecraft", 3600, "s1", 1_700_000_000)   # outside range (before from)
    _seed("Valorant", 7200, "s2", 1_700_010_000)    # inside range
    _seed("Apex", 1800, "s3", 1_700_020_000)        # outside range (after to)

    event = make_event(method="GET", query_params={"from": "1700005000", "to": "1700015000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 1
    assert body["total_hours"] == round(7200 / 3600, 2)
    assert len(body["games"]) == 1
    assert body["games"][0]["game"] == "Valorant"
    assert "range" in body
    assert body["range"]["from"] == 1700005000
    assert body["range"]["to"] == 1700015000


def test_dashboard_no_range_backward_compatible(ddb_table):
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET")
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    assert body["total_sessions"] == 2
    assert "range" not in body


def test_dashboard_only_from(ddb_table):
    # Seeds in the past; from=1_700_010_000 excludes the earliest one
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET", query_params={"from": "1700010000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Only Valorant session is at/after from; default to=now captures it
    assert body["total_sessions"] == 1
    assert body["games"][0]["game"] == "Valorant"
    assert "range" in body
    assert body["range"]["from"] == 1700010000


def test_dashboard_only_to(ddb_table):
    # Seeds in the past; to=1_700_005_000 includes only the earliest session
    _seed("Minecraft", 3600, "s1", 1_700_000_000)
    _seed("Valorant", 7200, "s2", 1_700_010_000)

    event = make_event(method="GET", query_params={"to": "1700005000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 200
    body = json.loads(resp["body"])

    # Only Minecraft session is at/before to; default from=0 includes it
    assert body["total_sessions"] == 1
    assert body["games"][0]["game"] == "Minecraft"
    assert "range" in body
    assert body["range"]["to"] == 1700005000


def test_dashboard_invalid_range_from_gt_to(ddb_table):
    event = make_event(method="GET", query_params={"from": "1700020000", "to": "1700010000"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "invalid_range"
    assert "details" in body


def test_dashboard_invalid_params_not_int(ddb_table):
    event = make_event(method="GET", query_params={"from": "abc"})
    resp = handler(event, FakeLambdaContext())
    assert resp["statusCode"] == 400
    body = json.loads(resp["body"])
    assert body["error"] == "invalid_range"
    assert "details" in body


# ---------------------------------------------------------------------------
# Phase 4 — overlap-aware aggregation (the Phasmo question)
# ---------------------------------------------------------------------------

def test_dashboard_phasmo_two_pcs_same_time_counts_once(ddb_table):
    """The plan's headline case: 5h on PC1 + 5h on PC2 at the same time
    should be 5h, not 10h. Also asserts overlap_stripped surfacing so the
    UI can show 'we saved you 5h of double counting'."""
    now = int(time.time())
    five_h = 5 * 3600
    start = now - 6 * 3600
    _seed("Phasmophobia", five_h, "pc1", start)
    _seed("Phasmophobia", five_h, "pc2", start)  # exact same window

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    # Top-level: total is the union across everything = 5h
    assert body["total_hours"] == 5.0
    assert body["raw_sum_hours"] == 10.0
    assert body["overlap_stripped_hours"] == 5.0
    # Per-game: same
    phasmo = body["games"][0]
    assert phasmo["total_sec"] == five_h
    assert phasmo["raw_sum_sec"] == 2 * five_h
    assert phasmo["overlap_stripped_sec"] == five_h


def test_dashboard_disjoint_sessions_sum_normally(ddb_table):
    """No overlap → union total equals raw sum. overlap_stripped is 0."""
    now = int(time.time())
    _seed("Phasmophobia", 3600, "a", now - 10_000)
    _seed("Phasmophobia", 3600, "b", now - 5_000)  # no overlap with a

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    assert body["total_hours"] == 2.0
    assert body["raw_sum_hours"] == 2.0
    assert body["overlap_stripped_hours"] == 0.0
    assert body["games"][0]["overlap_stripped_sec"] == 0


def test_dashboard_partial_overlap_merges_correctly(ddb_table):
    """Session A: 10:00-15:00 (5h), Session B: 13:00-17:00 (4h). Union = 7h."""
    now = int(time.time())
    a_start = now - 20_000
    _seed("Phasmophobia", 5 * 3600, "a", a_start)
    _seed("Phasmophobia", 4 * 3600, "b", a_start + 3 * 3600)

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    phasmo = body["games"][0]
    assert phasmo["total_sec"] == 7 * 3600
    assert phasmo["raw_sum_sec"] == 9 * 3600
    assert phasmo["overlap_stripped_sec"] == 2 * 3600


def test_dashboard_three_way_overlap_collapses(ddb_table):
    """Three cascading overlaps on the same game collapse to one merged span."""
    now = int(time.time())
    base = now - 30_000
    # 10-15, 12-18, 16-25 (in units of some seconds) → merged [10, 25]
    _seed("Phasmophobia", 5 * 100, "a", base + 10 * 100)
    _seed("Phasmophobia", 6 * 100, "b", base + 12 * 100)
    _seed("Phasmophobia", 9 * 100, "c", base + 16 * 100)

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    phasmo = body["games"][0]
    assert phasmo["total_sec"] == 15 * 100  # [10,25] wall span
    assert phasmo["raw_sum_sec"] == (5 + 6 + 9) * 100  # 20 * 100


def test_dashboard_cross_game_concurrency_stripped_at_top_level(ddb_table):
    """Game A on PC1 + Game B on PC2 at the same time. Per-game each stands
    alone. But the top-level total_hours should count the concurrent window
    once — that's honest 'wall-clock hours actually gaming'."""
    now = int(time.time())
    start = now - 4 * 3600
    _seed("GameA", 3600, "a", start)
    _seed("GameB", 3600, "b", start)  # exact same window

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    # Two different games, each counted individually (no per-game overlap)
    assert body["games"][0]["total_sec"] == 3600
    assert body["games"][1]["total_sec"] == 3600
    # But top-level wall-clock is only 1h (concurrent)
    assert body["total_hours"] == 1.0
    assert body["raw_sum_hours"] == 2.0
    assert body["overlap_stripped_hours"] == 1.0


def test_dashboard_decay_uses_union_not_raw_sum(ddb_table):
    """Overlapping sessions on the same game must not double-count under decay.
    Two identical 1h sessions both played 'now' → decay should be ~1h, not ~2h."""
    now = int(time.time())
    _seed("Phasmophobia", 3600, "pc1", now - 3600)
    _seed("Phasmophobia", 3600, "pc2", now - 3600)  # same window

    resp = handler(make_event(method="GET"), FakeLambdaContext())
    body = json.loads(resp["body"])

    phasmo = body["games"][0]
    # Just-now → weight ≈ 1.0, so decay ≈ 3600s ≈ 1 hour, not 7200/2 hours.
    assert phasmo["decay_sec"] < 3700  # slack for slight decay while test ran
    assert phasmo["decay_sec"] > 3500
