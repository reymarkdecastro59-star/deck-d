"""Start with Windows: a per-user Run key, default-on for the packaged app,
never re-enabled after the user turns it off."""
import types

import pytest

import autostart


class _FakeKey:
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


@pytest.fixture
def fake_reg(monkeypatch):
    store = {}

    def query(key, name):
        if name not in store:
            raise FileNotFoundError(name)
        return store[name], 1

    def delete(key, name):
        if name not in store:
            raise FileNotFoundError(name)
        del store[name]

    wr = types.SimpleNamespace(
        HKEY_CURRENT_USER=0, KEY_READ=1, KEY_SET_VALUE=2, REG_SZ=1,
        OpenKey=lambda *a: _FakeKey(),
        QueryValueEx=query,
        SetValueEx=lambda key, name, _r, _t, value: store.__setitem__(name, value),
        DeleteValue=delete,
    )
    monkeypatch.setattr(autostart, "_winreg", lambda: wr)
    monkeypatch.setattr(autostart.sys, "platform", "win32")
    monkeypatch.setattr(autostart.sys, "frozen", True, raising=False)
    return store


def test_enable_writes_quoted_exe_with_background_flag(fake_reg):
    assert autostart.enable(r"C:\Apps\DECK D\deckd.exe")
    assert fake_reg["DECKD"] == '"C:\\Apps\\DECK D\\deckd.exe" --background'
    assert autostart.is_enabled()


def test_disable_removes_and_is_idempotent(fake_reg):
    autostart.enable(r"C:\x\deckd.exe")
    assert autostart.disable()
    assert not autostart.is_enabled()
    assert autostart.disable()  # already gone is fine


def test_first_launch_turns_it_on(fake_reg):
    assert autostart.ensure_default_on(marker_exists=False, exe_path=r"C:\x\deckd.exe")
    assert autostart.is_enabled()


def test_never_re_enabled_after_user_turned_it_off(fake_reg):
    assert not autostart.ensure_default_on(marker_exists=True, exe_path=r"C:\x\deckd.exe")
    assert not autostart.is_enabled()


def test_repoints_when_enabled_and_exe_moved(fake_reg):
    autostart.enable(r"C:\old\deckd.exe")
    autostart.ensure_default_on(marker_exists=True, exe_path=r"C:\new\deckd.exe")
    assert fake_reg["DECKD"].startswith('"C:\\new\\deckd.exe"')


def test_source_runs_are_a_no_op(fake_reg, monkeypatch):
    monkeypatch.setattr(autostart.sys, "frozen", False, raising=False)
    assert not autostart.ensure_default_on(marker_exists=False)
    assert not autostart.is_enabled()
