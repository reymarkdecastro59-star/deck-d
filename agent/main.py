import threading
import time
import pystray
from PIL import Image, ImageDraw
import watcher
import sync
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
        sync.sync_sessions()


def _on_quit(icon, item):
    watcher.stop()
    icon.stop()


def main():
    if not is_logged_in():
        print("Not logged in. Run: python login.py")
        return

    watcher.start()
    threading.Thread(target=_sync_loop, daemon=True).start()

    icon = pystray.Icon(
        "DECK'D",
        _make_icon(),
        "DECK'D - Tracking",
        menu=pystray.Menu(pystray.MenuItem("Quit", _on_quit)),
    )
    icon.run()


if __name__ == "__main__":
    main()
