import time
import config
from launchers import steam, epic

_CACHE_TTL_SEC = 600  # 10 minutes
_cache: dict[str, str] = {}
_cached_at: float = 0.0


def _scan() -> dict[str, str]:
    tracked: dict[str, str] = {}
    tracked.update(steam.get_installed_games())
    tracked.update(epic.get_installed_games())

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
        _cache = _scan()
        _cached_at = now
    return _cache
