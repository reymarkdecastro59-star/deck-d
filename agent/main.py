import sys
import threading
import time
import pystray
from PIL import Image, ImageDraw
import watcher
import sync
import power
import session
from config import SYNC_INTERVAL_SEC
from auth import is_logged_in


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


def _tray_tooltip() -> str:
    """Include a dead-letter count in the tooltip so a user hovering the
    tray icon can see when data is stuck."""
    dead = session.get_dead_letter_count()
    if dead > 0:
        return f"DECK'D - Tracking ({dead} row{'s' if dead != 1 else ''} failed)"
    return "DECK'D - Tracking"


def _on_quit(icon, item):
    watcher.stop()
    power.stop()
    icon.stop()


def main():
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

    # Windows power events → close sessions on suspend, re-open on resume.
    # Non-Windows: power.start() is a no-op stub.
    power.start(on_suspend=watcher.suspend_all, on_resume=watcher.resume_check)

    icon = pystray.Icon(
        "DECK'D",
        _make_icon(),
        _tray_tooltip(),
        menu=pystray.Menu(pystray.MenuItem("Quit", _on_quit)),
    )
    icon.run()


if __name__ == "__main__":
    main()
