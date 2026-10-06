import os
import pytest
import boto3
from moto import mock_aws


TABLE_NAME = "deckd-test"
USER_ID = "user-abc-123"
USER_EMAIL = "test@example.com"


class FakeLambdaContext:
    """Minimal Lambda context substitute for unit tests."""
    function_name = "test-function"
    memory_limit_in_mb = 256
    invoked_function_arn = "arn:aws:lambda:us-east-1:123456789012:function:test-function"
    aws_request_id = "test-request-id"


_TEST_ENV = {
    "AWS_ACCESS_KEY_ID": "testing",
    "AWS_SECRET_ACCESS_KEY": "testing",
    "AWS_SECURITY_TOKEN": "testing",
    "AWS_SESSION_TOKEN": "testing",
    "AWS_DEFAULT_REGION": "us-east-1",
    "TABLE_NAME": TABLE_NAME,
}


def _set_test_env():
    os.environ.update(_TEST_ENV)


@pytest.fixture(scope="function")
def aws_credentials():
    _set_test_env()


@pytest.fixture(scope="session")
def _mocked_table():
    """Start moto and create the table ONCE per test run.

    Starting mock_aws and creating a table with two GSIs cost 4–7 s per test
    (≈9 minutes for the suite). Tests stay isolated because `ddb_table`
    empties the table after every test instead of rebuilding it.
    """
    _set_test_env()
    with mock_aws():
        client = boto3.client("dynamodb", region_name="us-east-1")
        client.create_table(
            TableName=TABLE_NAME,
            BillingMode="PAY_PER_REQUEST",
            AttributeDefinitions=[
                {"AttributeName": "pk", "AttributeType": "S"},
                {"AttributeName": "sk", "AttributeType": "S"},
                {"AttributeName": "gsi1pk", "AttributeType": "S"},
                {"AttributeName": "gsi1sk", "AttributeType": "S"},
                {"AttributeName": "gsi2pk", "AttributeType": "S"},
                {"AttributeName": "gsi2sk", "AttributeType": "S"},
            ],
            KeySchema=[
                {"AttributeName": "pk", "KeyType": "HASH"},
                {"AttributeName": "sk", "KeyType": "RANGE"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "gsi1",
                    "KeySchema": [
                        {"AttributeName": "gsi1pk", "KeyType": "HASH"},
                        {"AttributeName": "gsi1sk", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
                {
                    "IndexName": "gsi2",
                    "KeySchema": [
                        {"AttributeName": "gsi2pk", "KeyType": "HASH"},
                        {"AttributeName": "gsi2sk", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
        )
        yield boto3.resource("dynamodb", region_name="us-east-1").Table(TABLE_NAME)


def _empty_table(table):
    """Delete every item (paginated scan + batch delete) so the next test starts clean."""
    kwargs = {"ProjectionExpression": "pk, sk"}
    while True:
        page = table.scan(**kwargs)
        with table.batch_writer() as batch:
            for item in page.get("Items", []):
                batch.delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
        if "LastEvaluatedKey" not in page:
            return
        kwargs["ExclusiveStartKey"] = page["LastEvaluatedKey"]


@pytest.fixture(scope="function")
def ddb_table(_mocked_table):
    # Tests may mutate env vars (e.g. TABLE_NAME); restore before each test.
    _set_test_env()
    # Reset the module-level _table cache so each test gets a fresh resource
    import shared.db as db_module
    db_module._table = None
    try:
        yield _mocked_table
    finally:
        db_module._table = None
        _empty_table(_mocked_table)


def make_event(
    method: str = "GET",
    body: dict | None = None,
    path_params: dict | None = None,
    query_params: dict | None = None,
    user_id: str = USER_ID,
    email: str = USER_EMAIL,
    resource: str | None = None,
    raw_body: str | None = None,
    headers: dict | None = None,
) -> dict:
    import json
    if raw_body is not None:
        serialized_body = raw_body
    else:
        serialized_body = json.dumps(body) if body is not None else None
    return {
        "httpMethod": method,
        "resource": resource,
        "pathParameters": path_params,
        "queryStringParameters": query_params,
        "body": serialized_body,
        "headers": headers or {},
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": user_id,
                    "email": email,
                }
            }
        },
    }


@pytest.fixture(autouse=True)
def _rawg_offline(monkeypatch):
    """A fake RAWG key for code that requires one, and no real network from
    the upload-time art lookup (tests of ensure_metadata patch it themselves)."""
    monkeypatch.setenv("RAWG_API_KEY", os.environ.get("RAWG_API_KEY") or "test-key")
    import shared.metadata_ingest as mi
    from shared.rawg import _failed_item
    monkeypatch.setattr(mi, "fetch_metadata", lambda exe, name=None: _failed_item(exe, 0))
