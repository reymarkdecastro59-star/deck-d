"""DECK'D companion window: themed sign-in + a compact mini dashboard.

Rendered by WebView2 (Edge) through pywebview, so it shares the web app's
Signal Deck look instead of grey system dialogs. The page talks to Python
only through the in-process `Bridge` (pywebview js_api) — no local web
server, so nothing else on the machine can reach these calls, and the
password never leaves this process except in the Cognito sign-in request.
"""
import json
import os
import sys
import threading
import webbrowser

import auth
import autostart
import games
import notifications
import session
import sync
import token_store

try:
    import config
    WEB_URL = getattr(config, "WEB_URL", "http://localhost:5173").rstrip("/")
except Exception:  # noqa: BLE001
    WEB_URL = "http://localhost:5173"

VERSION = "0.2.0"

# Cognito error codes → copy a person can act on. Unknown-user and
# wrong-password share one message so the form never reveals whether an
# email has an account.
_FRIENDLY = {
    "NotAuthorizedException": "Incorrect email or password.",
    "UserNotFoundException": "Incorrect email or password.",
    "UserNotConfirmedException": "Confirm your email first: check your inbox for the code we sent.",
    "PasswordResetRequiredException": "Your password needs to be reset on the DECK'D website.",
    "TooManyRequestsException": "Too many attempts. Wait a minute, then try again.",
    "LimitExceededException": "Too many attempts. Wait a minute, then try again.",
}
_NETWORK = {"EndpointConnectionError", "ConnectionError", "ConnectTimeoutError", "ReadTimeoutError"}


def friendly_error(exc: Exception) -> str:
    code = None
    response = getattr(exc, "response", None)
    if isinstance(response, dict):
        code = (response.get("Error") or {}).get("Code")
    code = code or type(exc).__name__
    if code in _FRIENDLY:
        return _FRIENDLY[code]
    if code in _NETWORK or type(exc).__name__ in _NETWORK:
        return "Can't reach DECK'D right now. Check your internet connection."
    return "Sign-in didn't work. Please try again."


def resource_path(rel: str) -> str:
    """Path to a bundled file, in both the PyInstaller exe and source runs."""
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


class Bridge:
    """Methods callable from the window's JavaScript (pywebview js_api).

    Only public methods are exposed to JS; keep every helper/attribute
    underscore-prefixed.
    """

    def __init__(self, on_signed_in, on_signed_out, on_hide, on_minimize):
        self._on_signed_in = on_signed_in
        self._on_signed_out = on_signed_out
        self._on_hide = on_hide
        self._on_minimize = on_minimize

    # -- state ---------------------------------------------------------
    def get_state(self) -> dict:
        store = token_store.read()
        active = store.active_healthy()
        state = {
            "signed_in": active is not None,
            "email": active.email if active else None,
            "accounts": [
                {"email": a.email, "active": a.user_id == store.active_user_id, "revoked": a.revoked_at is not None}
                for a in store.accounts
            ],
            "autostart": autostart.is_enabled(),
            "autostart_supported": autostart.is_supported(),
            "watching": games.cached_count(),
            "version": VERSION,
            "web_url": WEB_URL,
        }
        if active is not None:
            state.update(session.local_summary(active.user_id))
        return state

    # -- account -------------------------------------------------------
    def sign_in(self, email: str, password: str) -> dict:
        email = (email or "").strip()
        if not email or not password:
            return {"ok": False, "error": "Enter your email and password."}
        try:
            auth.login(email, password)
        except Exception as exc:  # noqa: BLE001 — every failure becomes a friendly message
            return {"ok": False, "error": friendly_error(exc)}
        notifications.reset_session_dedup()
        self._on_signed_in()
        return {"ok": True, "state": self.get_state()}

    def sign_out(self) -> dict:
        auth.logout()
        self._on_signed_out()
        return self.get_state()

    # -- actions -------------------------------------------------------
    def set_autostart(self, enabled: bool) -> bool:
        (autostart.enable if enabled else autostart.disable)()
        return autostart.is_enabled()

    def sync_now(self) -> bool:
        threading.Thread(target=sync.sync_sessions, daemon=True).start()
        return True

    def open_dashboard(self) -> None:
        webbrowser.open(f"{WEB_URL}/dashboard")

    def open_signup(self) -> None:
        webbrowser.open(f"{WEB_URL}/signup")

    def hide(self) -> None:
        self._on_hide()

    def minimize(self) -> None:
        self._on_minimize()


class Companion:
    """Owns the single pywebview window. Closing it hides it (the tracker
    keeps running in the tray); only Quit destroys it."""

    # Frameless windows lose ~16x39 px to an undrawn border; these give a ~400x640 page.
    WIDTH, HEIGHT = 416, 680

    def __init__(self, on_signed_in, on_signed_out):
        self._window = None
        self._quitting = False
        self.bridge = Bridge(
            on_signed_in=on_signed_in,
            on_signed_out=on_signed_out,
            on_hide=self.hide,
            on_minimize=self.minimize,
        )

    def create(self, hidden: bool):
        import webview

        # Pass the page as HTML, not a file path: for local files pywebview
        # starts a built-in HTTP server (bottle on 127.0.0.1), which wasn't
        # bundled in the exe and left the window blank. Inline HTML needs no
        # server at all, so nothing listens on a local port.
        with open(resource_path(os.path.join("ui", "app.html")), encoding="utf-8") as fh:
            page = fh.read()
        self._window = webview.create_window(
            "DECK'D",
            html=page,
            js_api=self.bridge,
            width=self.WIDTH,
            height=self.HEIGHT,
            resizable=False,
            frameless=True,
            easy_drag=False,
            background_color="#0B0D10",
            hidden=hidden,
        )
        self._window.events.closing += self._on_closing
        return self._window

    def _on_closing(self):
        if self._quitting:
            return True
        self.hide()
        return False  # cancel the close: keep tracking in the tray

    def show(self, view: str | None = None) -> None:
        if self._window is None:
            return
        self._window.show()
        self._window.restore()
        self._window.evaluate_js(f"window.deckd && window.deckd.refresh({json.dumps(view)})")

    def hide(self) -> None:
        if self._window is not None:
            self._window.hide()

    def minimize(self) -> None:
        if self._window is not None:
            self._window.minimize()

    def quit(self) -> None:
        self._quitting = True
        if self._window is not None:
            self._window.destroy()
