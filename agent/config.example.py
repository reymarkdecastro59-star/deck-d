API_URL = "YOUR_API_GATEWAY_URL"
USER_POOL_ID = "YOUR_USER_POOL_ID"
CLIENT_ID = "YOUR_COGNITO_CLIENT_ID"
REGION = "ap-southeast-2"

# Games are auto-detected from Steam and Epic launchers.
# Add exe -> display name here for games the auto-detector misses.
GAME_OVERRIDES: dict[str, str] = {
    # "MyGame.exe": "My Game",
}

# Exe names to exclude from tracking (e.g., non-game apps picked up by
# the auto-detector's heuristic).
GAME_BLACKLIST: set[str] = set()

SYNC_INTERVAL_SEC = 60
POLL_INTERVAL_SEC = 5
