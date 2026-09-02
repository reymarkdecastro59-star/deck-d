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


@pytest.fixture(scope="function")
def aws_credentials():
    os.environ["AWS_ACCESS_KEY_ID"] = "testing"
    os.environ["AWS_SECRET_ACCESS_KEY"] = "testing"
    os.environ["AWS_SECURITY_TOKEN"] = "testing"
    os.environ["AWS_SESSION_TOKEN"] = "testing"
    os.environ["AWS_DEFAULT_REGION"] = "us-east-1"
    os.environ["TABLE_NAME"] = TABLE_NAME


@pytest.fixture(scope="function")
def ddb_table(aws_credentials):
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
                }
            ],
        )
        # Reset the module-level _table cache so each test gets a fresh resource
        import shared.db as db_module
        db_module._table = None
        yield boto3.resource("dynamodb", region_name="us-east-1").Table(TABLE_NAME)
        db_module._table = None


def make_event(
    method: str = "GET",
    body: dict | None = None,
    path_params: dict | None = None,
    query_params: dict | None = None,
    user_id: str = USER_ID,
    email: str = USER_EMAIL,
    resource: str | None = None,
    raw_body: str | None = None,
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
        "requestContext": {
            "authorizer": {
                "claims": {
                    "sub": user_id,
                    "email": email,
                }
            }
        },
    }
