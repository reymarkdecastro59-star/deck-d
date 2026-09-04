"""CORS response headers — must echo the non-simple headers browsers rely on."""
from shared.cors import CORS_HEADERS


def test_cors_allows_device_headers():
    """Strict browsers block a response if the non-simple request headers
    (X-Device-Id, X-Device-Name) aren't listed in Access-Control-Allow-Headers.
    Without this, the revocation gate silently bypasses for web clients."""
    allowed = CORS_HEADERS["Access-Control-Allow-Headers"]
    assert "X-Device-Id" in allowed
    assert "X-Device-Name" in allowed
    assert "Authorization" in allowed
