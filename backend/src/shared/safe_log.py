"""Error text that is safe to log.

`requests` exceptions embed the full request URL, and the RAWG and Steam
APIs take their key as a query parameter (`?key=...`). Logging `str(exc)`
would copy the key into CloudWatch. Use `safe_error(exc)` instead.
"""
import re

_SECRET_PARAMS = re.compile(r"(?i)\b(key|api_key|apikey|access_token|token)=[^&\s'\")]+")


def redact(text: str) -> str:
    return _SECRET_PARAMS.sub(lambda m: f"{m.group(1)}=***", text or "")


def safe_error(exc: BaseException, limit: int = 300) -> str:
    return f"{type(exc).__name__}: {redact(str(exc))}"[:limit]
