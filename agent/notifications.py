"""
winotify-based Windows toast notifications for the DECK'D tray agent.

Why winotify (not pystray.Icon.notify): winotify uses the modern
Windows.UI.Notifications API. That API survives Focus Assist during
fullscreen games and persists in Action Center. The old balloon-tip API
that pystray uses is eaten by Focus Assist — unacceptable for a feature
whose whole point is catching wrong attribution during gameplay.

Toasts are body-only. Action buttons need a deckd:// URI protocol
handler that requires an installer; deferred to a follow-up phase.

Dedup state is module-level (dies with the process). Keys:
- _notified_session_users: user_id — cleared on account switch or restart
- _notified_orphan_exes: exe   — cleared when the exe leaves running_exes
"""
from __future__ import annotations

from typing import TYPE_CHECKING

# Guard winotify import for non-Windows CI (matches token_store.py:50 local-import pattern)
try:
    from winotify import Notification, audio
except ModuleNotFoundError:  # non-Windows CI / dev machines without winotify
    Notification = None  # type: ignore[assignment,misc]
    audio = None  # type: ignore[assignment]

if TYPE_CHECKING:
    from token_store import Account

APP_ID = "DECK'D"
_ICON = None  # Set to an absolute .ico path once agent/assets/deckd.ico is shipped

_notified_session_users: set[str] = set()
_notified_orphan_exes: set[str] = set()


def _toast(title: str, body: str) -> None:
    if Notification is None:  # non-Windows fallback for tests without the mock
        return
    n = Notification(app_id=APP_ID, title=title, msg=body, icon=_ICON)
    n.set_audio(audio.Default, loop=False)
    n.show()


def on_no_active_account(exe: str, name: str) -> None:
    """Gap A: a game started but no account is active (≥1 stored)."""
    if exe in _notified_orphan_exes:
        return
    _notified_orphan_exes.add(exe)
    _toast(
        "DECK'D — Session dropped",
        f"{name} started, but no account is active. "
        "Open the DECK'D tray to select an account.",
    )


def on_active_account_revoked(exe: str, name: str, email: str) -> None:
    """Gap A edge: active_user_id is set but that account has been marked revoked."""
    if exe in _notified_orphan_exes:
        return
    _notified_orphan_exes.add(exe)
    _toast(
        "DECK'D — Session dropped",
        f"{name} started, but {email} was revoked. "
        "Un-revoke this device from your DECK'D dashboard to resume.",
    )


def on_device_revoked_by_backend(email: str) -> None:
    """Gap C: sync got 403 device_revoked. Fires every time (self-limits via sync filter)."""
    _toast(
        "DECK'D — Device revoked",
        f"This device was revoked from {email}. "
        "Un-revoke from your DECK'D dashboard, then use 'Retry sync' in the tray.",
    )


def on_session_opened(exe: str, name: str, account: "Account") -> None:
    """Confirm which account a fresh session is being credited to. Dedup per user_id."""
    if account.user_id in _notified_session_users:
        return
    _notified_session_users.add(account.user_id)
    _toast(
        "DECK'D — Tracking",
        f"{name} is being credited to {account.email}. "
        "Switch account from the tray if that's wrong.",
    )


def on_orphan_exe_stopped(exe: str) -> None:
    """Clear the exe from orphan dedup so a future launch can re-notify. No-op if absent."""
    _notified_orphan_exes.discard(exe)


def reset_session_dedup() -> None:
    """Called on account switch. Next session opens under the new account will re-notify."""
    _notified_session_users.clear()
