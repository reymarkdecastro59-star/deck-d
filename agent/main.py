import sys
import threading
import time

import pystray
from PIL import Image, ImageDraw

import token_store
import watcher
import sync
import power
import session
from auth import is_logged_in
from config import SYNC_INTERVAL_SEC

# Icon reference set once main() starts, so _refresh_tray can find it.
_ICON_REF = None


def _make_icon():
    img = Image.new("RGB", (64, 64), color=(15, 23, 42))
    draw = ImageDraw.Draw(img)
    draw.ellipse([16, 16, 48, 48], fill=(34, 211, 238))
    return img


def _sync_loop():
    while True:
        time.sleep(SYNC_INTERVAL_SEC)
        try:
            sync.sync_sessions()
        except Exception as exc:
            # Never let a single sync tick kill the thread — that would
            # leave the queue growing silently until the user notices.
            print(f"[deckd] sync tick raised: {exc}", file=sys.stderr)


# ---------- tooltip + menu (Phase 6 + Phase 5 dead-letter counter) ---------

def _tooltip_for(store) -> str:
    active = store.active_healthy()
    if active:
        base = f"DECK'D — Tracking as {active.email}"
    elif store.accounts:
        base = "DECK'D — No active account"
    else:
        base = "DECK'D — Not signed in"
    # Phase 5: surface dead-lettered rows so the user knows sync is stuck.
    dead = session.get_dead_letter_count()
    if dead > 0:
        return f"{base} ({dead} row{'s' if dead != 1 else ''} failed)"
    return base


def _header_item(store):
    """Disabled first item echoing the tooltip, so state is visible when the menu opens."""
    return pystray.MenuItem(_tooltip_for(store), None, enabled=False)


def _make_switch_action(uid):
    """Factory for switch action closures."""
    def action(icon, item):
        _on_switch_click(uid)
    return action


def _make_checked_fn(uid):
    """Factory for checked-state lambdas."""
    def checked(item):
        return token_store.read().active_user_id == uid
    return checked


def _build_menu():
    store = token_store.read()
    active = store.active_healthy()
    items = [_header_item(store), pystray.Menu.SEPARATOR]

    if store.accounts:
        submenu_items = []
        for a in store.accounts:
            label = a.email + (" (revoked)" if a.revoked_at else "")
            uid = a.user_id
            revoked = a.revoked_at is not None
            submenu_items.append(pystray.MenuItem(
                label,
                _make_switch_action(uid),
                checked=_make_checked_fn(uid),
                radio=True,
                enabled=not revoked,
            ))
        items.append(pystray.MenuItem("Switch account", pystray.Menu(*submenu_items)))

    items.append(pystray.MenuItem("Add account…", _on_add_account))
    if active is not None:
        items.append(pystray.MenuItem("Log out this account", _on_logout))
    if any(a.revoked_at for a in store.accounts):
        items.append(pystray.MenuItem("Retry sync", _on_retry_sync))
    items += [pystray.Menu.SEPARATOR, pystray.MenuItem("Quit", _on_quit)]
    return items


def _refresh_tray(icon=None):
    """Force pystray to re-render the menu + tooltip after a state change."""
    target = icon or _ICON_REF
    if target is None:
        return
    store = token_store.read()
    target.title = _tooltip_for(store)
    target.update_menu()


# ---------- handlers (stubs; wired up in Tasks 7 and 8) --------------------

def _on_switch_click(target_user_id: str):
    """Wired up in Task 6."""
    pass


def _on_add_account(icon, item):
    """Wired up in Task 7."""
    pass


def _on_logout(icon, item):
    """Wired up in Task 7."""
    pass


def _on_retry_sync(icon, item):
    """Wired up in Task 7."""
    pass


def _on_quit(icon, item):
    watcher.stop()
    power.stop()
    icon.stop()


def main():
    global _ICON_REF
    if not is_logged_in():
        print("Not logged in. Run: python login.py")
        return

    # Phase 5: close any sessions the watcher left open on last crash BEFORE
    # the fresh watcher starts, so we don't race on the same row.
    closed, dead = session.recover_orphan_sessions()
    if closed or dead:
        print(f"[deckd] Startup crash recovery: closed {closed}, dead-lettered {dead}",
              file=sys.stderr)

    watcher.start()
    threading.Thread(target=_sync_loop, daemon=True).start()

    # Phase 5: Windows power events → close sessions on suspend, re-open on
    # resume. Non-Windows: power.start() is a no-op stub.
    power.start(on_suspend=watcher.suspend_all, on_resume=watcher.resume_check)

    store = token_store.read()
    icon = pystray.Icon(
        "DECK'D",
        _make_icon(),
        _tooltip_for(store),
        menu=pystray.Menu(_build_menu),
    )
    _ICON_REF = icon
    icon.run()


if __name__ == "__main__":
    main()
