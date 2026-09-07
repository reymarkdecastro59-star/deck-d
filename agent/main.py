import sys
import threading
import time
import subprocess
import os

import pystray
from PIL import Image, ImageDraw

import auth
import notifications
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
        _refresh_tray()  # Phase 6: pick up any state changes (new logins, revocations cleared, etc.)


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

def _on_switch_click(target_user_id: str) -> None:
    """Switch active account. If games are open, ask the user first."""
    store = token_store.read()
    if store.active_user_id == target_user_id:
        return  # radio-click on the already-active row

    open_games = watcher.list_open_sessions()
    if open_games and not _confirm_switch_dialog(open_games):
        return

    auth.switch_account(target_user_id)
    notifications.reset_session_dedup()
    _refresh_tray()


def _confirm_switch_dialog(open_games) -> bool:
    """
    Prompt the user before switching mid-game.

    Runs Tk on a dedicated thread and joins — a Tk root cannot safely live
    on the pystray thread. Returns True for Yes, False for No/close.
    """
    import queue
    q: "queue.Queue[bool]" = queue.Queue()

    def _run():
        try:
            import tkinter as tk
            from tkinter import messagebox
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            store = token_store.read()
            current = store.active_healthy() or store.active()
            current_email = current.email if current else "the current account"
            game_names = ", ".join(name for _, name in open_games)
            answer = messagebox.askyesno(
                title="DECK'D — Switch account?",
                message=(
                    f"{game_names} is playing under {current_email}.\n\n"
                    f"Switching won't reassign this session — playtime stays with "
                    f"{current_email}. Switch active account anyway?"
                ),
                icon="warning",
            )
            q.put(bool(answer))  # capture the answer BEFORE destroy so a destroy exception can't drop a Yes
            root.destroy()
        except Exception:
            q.put(False)  # any dialog failure defaults to not-switching

    t = threading.Thread(target=_run, daemon=True)
    t.start()
    t.join(timeout=60)   # cap the wait so a hung Tk can't freeze the tray thread
    if t.is_alive():
        return False     # dialog never returned; treat as cancellation
    try:
        return q.get_nowait()
    except queue.Empty:
        return False


def _on_add_account(icon, item):
    """Spawn login.py as a detached subprocess. Fire-and-forget — tray reads store fresh."""
    login_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "login.py")
    subprocess.Popen([sys.executable, login_path])
    _refresh_tray()


def _on_logout(icon, item):
    """Remove the active account and refresh the tray."""
    auth.logout()
    _refresh_tray()


def _on_retry_sync(icon, item):
    """Clear all local revoked flags and force a sync tick (async so tray stays responsive)."""
    store = token_store.read()
    for a in store.accounts:
        if a.revoked_at is not None:
            store.clear_revoked(a.user_id)
    token_store.write(store)
    _refresh_tray()  # immediate menu update

    def _drain():
        sync.sync_sessions()
        _refresh_tray()

    threading.Thread(target=_drain, daemon=True).start()


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
