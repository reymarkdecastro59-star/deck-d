"""The agent's Cognito calls must never read the machine's AWS credentials.

InitiateAuth / SignUp / ConfirmSignUp are public Cognito APIs. A signed
boto3 client still resolves the default credential chain, so a developer's
`aws login` profile (needs botocore[crt]) broke tracker sign-in with
"Missing Dependency: Using the login credential provider…". Clients are
created unsigned so ~/.aws config can't affect end-user sign-in.
"""
import botocore.session
import pytest
from botocore import UNSIGNED

import auth


@pytest.fixture
def broken_credentials(monkeypatch):
    def boom(self, *a, **k):
        raise RuntimeError("credential chain must not be touched")
    monkeypatch.setattr(botocore.session.Session, "get_credentials", boom)


def test_auth_client_is_unsigned_and_ignores_credentials(broken_credentials):
    client = auth._cognito_client()
    assert client.meta.config.signature_version is UNSIGNED
