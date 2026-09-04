"""Tests for the interval-union math used by overlap-aware aggregation."""
from shared.intervals import merge_intervals, union_seconds


# ---------- merge_intervals -------------------------------------------------

def test_empty_returns_empty():
    assert merge_intervals([]) == []


def test_single_interval_unchanged():
    assert merge_intervals([(10, 20)]) == [(10, 20)]


def test_disjoint_intervals_kept_separate():
    """Two sessions with no wall-clock overlap: total is the sum."""
    assert merge_intervals([(10, 20), (30, 40)]) == [(10, 20), (30, 40)]


def test_fully_overlapping_collapses_to_one():
    """The Phasmo case: 5h on PC1 and 5h on PC2 at the exact same time = 5h."""
    assert merge_intervals([(10, 20), (10, 20)]) == [(10, 20)]


def test_partial_overlap_merges():
    """10:00-15:00 on PC1 + 13:00-17:00 on PC2 = 10:00-17:00 (7h)."""
    assert merge_intervals([(10, 15), (13, 17)]) == [(10, 17)]


def test_one_interval_wholly_contains_another():
    """The shorter session is absorbed — no extra time added."""
    assert merge_intervals([(10, 100), (30, 50)]) == [(10, 100)]


def test_adjacent_intervals_merge_at_boundary():
    """Session A ends at t=20, session B starts at t=20 → single [10, 30)."""
    assert merge_intervals([(10, 20), (20, 30)]) == [(10, 30)]


def test_three_way_overlap_collapses():
    """Cascading overlaps: 10-15 + 12-18 + 16-25 = [10, 25]."""
    assert merge_intervals([(10, 15), (12, 18), (16, 25)]) == [(10, 25)]


def test_unsorted_input_still_merges_correctly():
    """Sweep-line requires sorted input; verify the function sorts internally."""
    assert merge_intervals([(30, 40), (10, 20)]) == [(10, 20), (30, 40)]


def test_dropped_negative_length_interval():
    """started_at >= ended_at rows must not crash aggregation — silently skip."""
    assert merge_intervals([(10, 20), (30, 30), (40, 20)]) == [(10, 20)]


# ---------- union_seconds ---------------------------------------------------

def test_union_of_disjoint_sums_individual_lengths():
    assert union_seconds([(0, 100), (200, 300)]) == 200


def test_union_of_full_overlap_returns_one_length():
    """The Phasmo answer: 5h + 5h fully overlapping = 5h, not 10h."""
    assert union_seconds([(0, 18_000), (0, 18_000)]) == 18_000


def test_union_of_partial_overlap_returns_merged_length():
    """10:00-15:00 + 13:00-17:00 = 10:00-17:00 = 7h (25200s)."""
    assert union_seconds([(36_000, 54_000), (46_800, 61_200)]) == 25_200


def test_union_of_adjacent_returns_sum():
    """Adjacent (touching but not overlapping) = single interval, sum length."""
    assert union_seconds([(0, 100), (100, 250)]) == 250


def test_union_of_empty_is_zero():
    assert union_seconds([]) == 0
