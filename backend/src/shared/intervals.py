"""
Interval-union math for overlap-aware playtime aggregation.

The naive `sum(duration_sec)` double-counts sessions that overlap on the
wall clock — the classic case being the same game running on two PCs
simultaneously. This module returns the union of a set of intervals so
overlapping time is counted once.

The functions here operate on plain (start, end) tuples and are pure —
no I/O, no models. Callers convert Session rows to tuples on the way in.
"""
from __future__ import annotations

Interval = tuple[int, int]


def merge_intervals(intervals: list[Interval]) -> list[Interval]:
    """
    Standard sweep-line merge. O(n log n) via the sort, O(n) merge pass.

    Intervals are treated as half-open [start, end) on epoch seconds. Adjacent
    intervals where `s == last_e` (session A ends the same second session B
    starts) are joined into one span; the total duration is unchanged either
    way, but the merged form is tidier for downstream weighted-sum passes.

    Empty and negative-length intervals (start >= end) are silently dropped —
    the ingest validator already rejects them, but be defensive here so an
    aggregation call on legacy data never crashes.
    """
    cleaned = [(s, e) for s, e in intervals if s < e]
    if not cleaned:
        return []
    cleaned.sort()
    merged: list[Interval] = [cleaned[0]]
    for s, e in cleaned[1:]:
        last_s, last_e = merged[-1]
        if s <= last_e:  # touches or overlaps
            if e > last_e:
                merged[-1] = (last_s, e)
        else:
            merged.append((s, e))
    return merged


def union_seconds(intervals: list[Interval]) -> int:
    """Total wall-clock seconds covered by the union of `intervals`."""
    return sum(e - s for s, e in merge_intervals(intervals))
