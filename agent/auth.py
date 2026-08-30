import boto3
import time
import json
import os
from config import CLIENT_ID, REGION

_token_cache = {}
_CACHE_FILE = os.path.join(os.path.expanduser("~"), ".deckd", "tokens.json")


def _load_cache():
    global _token_cache
    try:
        with open(_CACHE_FILE) as f:
            _token_cache = json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        _token_cache = {}


def _save_cache():
    os.makedirs(os.path.dirname(_CACHE_FILE), exist_ok=True)
    with open(_CACHE_FILE, "w") as f:
        json.dump(_token_cache, f)


def login(email: str, password: str) -> dict:
    client = boto3.client("cognito-idp", region_name=REGION)
    resp = client.initiate_auth(
        AuthFlow="USER_PASSWORD_AUTH",
        AuthParameters={"USERNAME": email, "PASSWORD": password},
        ClientId=CLIENT_ID,
    )
    result = resp["AuthenticationResult"]
    _token_cache.update({
        "id_token": result["IdToken"],
        "refresh_token": result["RefreshToken"],
        "expires_at": int(time.time()) + result["ExpiresIn"] - 600,  # refresh 10min early
    })
    _save_cache()
    return _token_cache


def get_id_token() -> str:
    # API Gateway's Cognito authorizer validates ID tokens, not access tokens.
    _load_cache()
    if not _token_cache.get("id_token"):
        raise RuntimeError("Not logged in. Run login() first.")

    if time.time() < _token_cache.get("expires_at", 0):
        return _token_cache["id_token"]

    client = boto3.client("cognito-idp", region_name=REGION)
    resp = client.initiate_auth(
        AuthFlow="REFRESH_TOKEN_AUTH",
        AuthParameters={"REFRESH_TOKEN": _token_cache["refresh_token"]},
        ClientId=CLIENT_ID,
    )
    result = resp["AuthenticationResult"]
    _token_cache.update({
        "id_token": result["IdToken"],
        "expires_at": int(time.time()) + result["ExpiresIn"] - 600,
    })
    _save_cache()
    return _token_cache["id_token"]


def is_logged_in() -> bool:
    _load_cache()
    return bool(_token_cache.get("id_token"))
