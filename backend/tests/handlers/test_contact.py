import json
from unittest.mock import MagicMock, patch

import boto3
import pytest
from botocore.stub import ANY, Stubber

from handlers.contact import handler


VALID_PAYLOAD = {
    "name": "Reymark",
    "email": "visitor@example.com",
    "message": "I would like to try DECK'D.",
    "captchaToken": "captcha-token",
}


@pytest.fixture(autouse=True)
def contact_environment(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    monkeypatch.setenv("AWS_SESSION_TOKEN", "testing")
    monkeypatch.setenv("HCAPTCHA_SECRET", "test-secret")
    monkeypatch.setenv("SES_SENDER_EMAIL", "reymarkdecastro59@gmail.com")
    monkeypatch.setenv("SES_RECIPIENT_EMAIL", "reymarkdecastro59@gmail.com")
    monkeypatch.setenv("AWS_REGION", "ap-southeast-2")
    monkeypatch.delenv("HCAPTCHA_VERIFY_URL", raising=False)


def _event(payload=None):
    return {"body": json.dumps(VALID_PAYLOAD if payload is None else payload)}


def _captcha_response(success):
    response = MagicMock()
    response.read.return_value = json.dumps({"success": success}).encode("utf-8")
    response.__enter__.return_value = response
    response.__exit__.return_value = False
    return response


def _ses_client():
    return boto3.session.Session().client("ses", region_name="ap-southeast-2")


SES_EXPECTED_PARAMS = {
    "Source": "reymarkdecastro59@gmail.com",
    "Destination": {"ToAddresses": ["reymarkdecastro59@gmail.com"]},
    "ReplyToAddresses": ["visitor@example.com"],
    "Message": ANY,
}


@patch("handlers.contact.boto3.client")
@patch("handlers.contact.urllib.request.urlopen")
def test_happy_path(mock_urlopen, mock_boto_client):
    mock_urlopen.return_value = _captcha_response(True)
    ses = _ses_client()
    mock_boto_client.return_value = ses

    with Stubber(ses) as stubber:
        stubber.add_response(
            "send_email",
            {"MessageId": "test-message-id"},
            SES_EXPECTED_PARAMS,
        )
        response = handler(_event(), None)

    assert response["statusCode"] == 200
    assert json.loads(response["body"]) == {"ok": True}
    request = mock_urlopen.call_args.args[0]
    assert request.full_url == "https://api.hcaptcha.com/siteverify"
    assert b"secret=test-secret" in request.data
    assert b"response=captcha-token" in request.data


@pytest.mark.parametrize(
    ("payload", "field"),
    [
        ({key: value for key, value in VALID_PAYLOAD.items() if key != "name"}, "name"),
        ({**VALID_PAYLOAD, "email": "not-an-email"}, "email"),
        ({**VALID_PAYLOAD, "message": "too short"}, "message"),
    ],
)
def test_invalid_input(payload, field):
    response = handler(_event(payload), None)

    assert response["statusCode"] == 400
    assert json.loads(response["body"]) == {
        "error": "invalid_input",
        "field": field,
    }


@patch("handlers.contact.boto3.client")
@patch("handlers.contact.urllib.request.urlopen")
def test_captcha_failure(mock_urlopen, mock_boto_client):
    mock_urlopen.return_value = _captcha_response(False)

    response = handler(_event(), None)

    assert response["statusCode"] == 400
    assert json.loads(response["body"]) == {"error": "captcha_failed"}
    mock_boto_client.assert_not_called()


@patch("handlers.contact.boto3.client")
@patch("handlers.contact.urllib.request.urlopen")
def test_ses_failure(mock_urlopen, mock_boto_client):
    mock_urlopen.return_value = _captcha_response(True)
    ses = _ses_client()
    mock_boto_client.return_value = ses

    with Stubber(ses) as stubber:
        stubber.add_client_error(
            "send_email",
            service_error_code="MessageRejected",
            service_message="rejected",
            expected_params=SES_EXPECTED_PARAMS,
        )
        response = handler(_event(), None)

    assert response["statusCode"] == 500
    assert json.loads(response["body"]) == {"error": "email_send_failed"}


@patch("handlers.contact.boto3.client")
@patch("handlers.contact.urllib.request.urlopen")
def test_missing_hcaptcha_secret(mock_urlopen, mock_boto_client, monkeypatch):
    monkeypatch.delenv("HCAPTCHA_SECRET")

    response = handler(_event(), None)

    assert response["statusCode"] == 500
    assert json.loads(response["body"]) == {"error": "server_misconfigured"}
    mock_urlopen.assert_not_called()
    mock_boto_client.assert_not_called()
