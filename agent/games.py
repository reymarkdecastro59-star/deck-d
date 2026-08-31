import time
import config
from launchers import steam, epic, registry, pe_detector

_CACHE_TTL_SEC = 600  # 10 minutes
_cache: dict[str, str] = {}
_cached_at: float = 0.0


def _scan() -> dict[str, str]:
    tracked: dict[str, str] = {}
    tracked.update(steam.get_installed_games())
    tracked.update(epic.get_installed_games())

    # PE-signature scan of registry-installed programs catches games
    # from launchers we don't parse (Riot, Ubisoft, HoYoPlay, Kuro,
    # NetEase, etc.) and standalone installs. setdefault preserves
    # Steam/Epic display names for exes we already know.
    for name, install_dir in registry.enumerate_installed_programs():
        for exe in pe_detector.find_game_exes(install_dir):
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
        _cache = _scan()
        _cached_at = now
    return _cache
