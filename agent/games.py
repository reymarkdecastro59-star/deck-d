import sys
import time
import config
from launchers import steam, epic, registry, pe_detector

_CACHE_TTL_SEC = 600  # 10 minutes
_cache: dict[str, str] = {}
_cached_at: float = 0.0


def _safe(label: str, fn, default):
    """Run one launcher scan and swallow its exceptions so a single bad
    launcher can't take down the whole tracker. Return `default` on failure."""
    try:
        return fn()
    except Exception as exc:  # noqa: BLE001
        print(f"[deckd] games._scan: {label} failed: {exc}", file=sys.stderr)
        return default


def _scan() -> dict[str, str]:
    tracked: dict[str, str] = {}
    tracked.update(_safe("steam", steam.get_installed_games, {}))
    tracked.update(_safe("epic", epic.get_installed_games, {}))

    # PE-signature scan of registry-installed programs catches games
    # from launchers we don't parse (Riot, Ubisoft, HoYoPlay, Kuro,
    # NetEase, etc.) and standalone installs. setdefault preserves
    # Steam/Epic display names for exes we already know.
    for name, install_dir in _safe("registry", registry.enumerate_installed_programs, []):
        for exe in _safe(f"pe:{name}", lambda d=install_dir: pe_detector.find_game_exes(d), []):
            tracked.setdefault(exe, name)

    overrides = getattr(config, "GAME_OVERRIDES", {}) or {}
    tracked.update(overrides)

    blacklist = getattr(config, "GAME_BLACKLIST", set()) or set()
    for exe in blacklist:
        tracked.pop(exe, None)

    return tracked


def get_tracked(refresh: bool = False) -> dict[str, str]:
    global _cache, _cached_at
    now = time.time()
    if refresh or not _cache or (now - _cached_at) > _CACHE_TTL_SEC:
        try:
            _cache = _scan()
            _cached_at = now
        except Exception as exc:  # noqa: BLE001
            # Absolute worst case: keep serving the previous cache rather
            # than raising up into the watcher thread.
            print(f"[deckd] games.get_tracked: scan raised: {exc}", file=sys.stderr)
    return _cache
