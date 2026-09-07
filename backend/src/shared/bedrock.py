"""Thin wrapper around Bedrock Runtime for Claude Haiku 4.5 invocations.

Two module-level caches back this file:
    - `_client`: the boto3 client, reused across warm Lambda invocations.
    - `_inference_profile_arn`: the fully-qualified inference profile ARN,
      constructed once per cold start from the Lambda context.

Cross-region inference profiles are how Bedrock exposes Haiku 4.5 in
ap-southeast-2 — you invoke the *profile* ARN, not the raw model ID. The
account portion of the ARN is unknown at deploy time (SAM can't inject a
runtime AWS::AccountId into env vars in a portable way), so we derive it
from `context.invoked_function_arn` at first use.
"""
import json
import logging
import os
from typing import Optional

import boto3

logger = logging.getLogger(__name__)


class BedrockError(Exception):
    """Base error for anything that goes wrong invoking Bedrock."""


class BedrockBadResponseError(BedrockError):
    """Bedrock returned a response we couldn't parse into content text."""


_client = None
_inference_profile_arn: Optional[str] = None

_DEFAULT_PROFILE_ID = "apac.anthropic.claude-haiku-4-5-v1:0"
_ANTHROPIC_VERSION = "bedrock-2023-05-31"


def get_client():
    """Return the module-level bedrock-runtime client (created on first call)."""
    global _client
    if _client is None:
        _client = boto3.client("bedrock-runtime")
    return _client


def _profile_id() -> str:
    return os.environ.get("BEDROCK_INFERENCE_PROFILE_ID", _DEFAULT_PROFILE_ID)


def get_inference_profile_arn(context) -> str:
    """Build (once) and return the cross-region inference profile ARN.

    Lambda's invoked_function_arn is:
        arn:aws:lambda:<region>:<account_id>:function:<name>
    → split on ':' gives us both region [3] and account [4]. Bedrock ARN:
        arn:aws:bedrock:<region>:<account_id>:inference-profile/<profile_id>
    """
    global _inference_profile_arn
    if _inference_profile_arn is not None:
        return _inference_profile_arn

    parts = context.invoked_function_arn.split(":")
    if len(parts) < 5:
        raise BedrockError(
            f"cannot parse account/region from invoked_function_arn={context.invoked_function_arn}"
        )
    region = parts[3]
    account_id = parts[4]
    _inference_profile_arn = (
        f"arn:aws:bedrock:{region}:{account_id}:inference-profile/{_profile_id()}"
    )
    return _inference_profile_arn


def _reset_cache() -> None:
    """Test-only: clear the cached client + ARN. Callers in prod never touch this."""
    global _client, _inference_profile_arn
    _client = None
    _inference_profile_arn = None


def invoke_haiku(context, system: str, user: str, max_tokens: int = 400) -> dict:
    """Invoke Claude Haiku 4.5 with a system + user message pair.

    Returns a dict with keys `text` (assistant reply string) and `usage`
    (Bedrock's token counts). Raises BedrockError on any non-2xx or malformed
    response; caller is responsible for catching and degrading gracefully.
    """
    arn = get_inference_profile_arn(context)
    body = {
        "anthropic_version": _ANTHROPIC_VERSION,
        "max_tokens": max_tokens,
        "system": system,
        "messages": [{"role": "user", "content": user}],
    }
    resp = get_client().invoke_model(
        modelId=arn,
        body=json.dumps(body),
        contentType="application/json",
        accept="application/json",
    )
    try:
        payload = json.loads(resp["body"].read())
        content = payload.get("content") or []
        text = content[0]["text"] if content else ""
    except (json.JSONDecodeError, KeyError, IndexError, TypeError) as exc:
        raise BedrockBadResponseError(f"malformed bedrock response: {exc}") from exc

    return {
        "text": text,
        "usage": payload.get("usage", {}),
    }
