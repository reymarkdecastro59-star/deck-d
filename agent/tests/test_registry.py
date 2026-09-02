import sys
from pathlib import Path

from launchers import registry


def test_returns_empty_on_non_windows(monkeypatch):
    monkeypatch.setattr(sys, "platform", "linux")
    assert registry.enumerate_installed_programs() == []


def test_returns_valid_shape_on_current_os():
    result = registry.enumerate_installed_programs()
    assert isinstance(result, list)
    for entry in result:
        assert isinstance(entry, tuple) and len(entry) == 2
        name, path = entry
        assert isinstance(name, str) and name
        assert isinstance(path, Path) and path.exists() and path.is_dir()
