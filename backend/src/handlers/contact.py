"""Public contact-form handler backed by hCaptcha and Amazon SES."""

import base64
import json
import logging
import os
import re
import urllib.parse
import urllib.request

import boto3
from botocore.exceptions import ClientError


logger = logging.getLogger(__name__)

DEFAULT_HCAPTCHA_VERIFY_URL = "https://api.hcaptcha.com/siteverify"
EMAIL_RE = re.compile(
    r"^(?!\.)(?!.*\.\.)[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+(?<!\.)@"
    r"[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?"
    r"(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$"
)
RESPONSE_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
}


def handler(event, context):
    """Validate a contact submission and deliver it through SES."""
    payload = _parse_body(event)
    if payload is None:
        return _response(400, {"error": "invalid_input", "field": "body"})

    validated, field = _validate_payload(payload)
    if field:
        return _response(400, {"error": "invalid_input", "field": field})

    captcha_secret = os.environ.get("HCAPTCHA_SECRET", "").strip()
    if not captcha_secret:
        return _response(500, {"error": "server_misconfigured"})

    if not _verify_captcha(captcha_secret, validated["captchaToken"]):
        return _response(400, {"error": "captcha_failed"})

    sender = os.environ.get("SES_SENDER_EMAIL", "").strip()
    recipient = os.environ.get("SES_RECIPIENT_EMAIL", "").strip()
    if not sender or not recipient:
        return _response(500, {"error": "server_misconfigured"})

    try:
        ses = boto3.client(
            "ses",
            region_name=os.environ.get("AWS_REGION", "ap-southeast-2"),
        )
        subject_name = validated["name"].replace("\r", " ").replace("\n", " ")
        ses.send_email(
            Source=sender,
            Destination={"ToAddresses": [recipient]},
            ReplyToAddresses=[validated["email"]],
            Message={
                "Subject": {
                    "Data": f"[DECK'D contact] {subject_name[:60]}",
                    "Charset": "UTF-8",
                },
                "Body": {
                    "Text": {
                        "Data": (
                            f"Name: {validated['name']}\n"
                            f"Email: {validated['email']}\n\n"
                            f"Message:\n{validated['message']}\n\n"
                            "--\nSent via DECK'D landing contact form."
                        ),
                        "Charset": "UTF-8",
                    }
                },
            },
        )
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "Unknown")
        logger.error("SES send_email failed with code %s", error_code)
        return _response(500, {"error": "email_send_failed"})

    return _response(200, {"ok": True})


def _parse_body(event):
    try:
        body = event.get("body")
        if not isinstance(body, (str, bytes)):
            return None
        if event.get("isBase64Encoded"):
            body = base64.b64decode(body, validate=True).decode("utf-8")
        elif isinstance(body, bytes):
            body = body.decode("utf-8")
        payload = json.loads(body)
        return payload if isinstance(payload, dict) else None
    except (ValueError, TypeError, UnicodeDecodeError):
        return None


def _validate_payload(payload):
    name = payload.get("name")
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
        return None, "name"

    email = payload.get("email")
    if (
        not isinstance(email, str)
        or not 1 <= len(email.strip()) <= 320
        or EMAIL_RE.fullmatch(email.strip()) is None
    ):
        return None, "email"

    message = payload.get("message")
    if not isinstance(message, str) or not 10 <= len(message.strip()) <= 5000:
        return None, "message"

    captcha_token = payload.get("captchaToken")
    if not isinstance(captcha_token, str) or not captcha_token.strip():
        return None, "captchaToken"

    return {
        "name": name.strip(),
        "email": email.strip(),
        "message": message.strip(),
        "captchaToken": captcha_token.strip(),
    }, None


def _verify_captcha(secret, token):
    verify_url = os.environ.get(
        "HCAPTCHA_VERIFY_URL", DEFAULT_HCAPTCHA_VERIFY_URL
    )
    form_body = urllib.parse.urlencode(
        {"secret": secret, "response": token}
    ).encode("utf-8")
    request = urllib.request.Request(
        verify_url,
        data=form_body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            result = json.loads(response.read().decode("utf-8"))
    except (OSError, ValueError, TypeError, UnicodeDecodeError):
        logger.warning("hCaptcha verification request failed")
        return False

    return result.get("success") is True if isinstance(result, dict) else False


def _response(status_code, body):
    return {
        "statusCode": status_code,
        "headers": RESPONSE_HEADERS,
        "body": json.dumps(body),
    }
