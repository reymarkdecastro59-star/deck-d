import os
import boto3
from boto3.dynamodb.conditions import Key
from .models import Session, UserProfile

_table = None


def get_table():
    global _table
    if _table is None:
        dynamodb = boto3.resource("dynamodb")
        _table = dynamodb.Table(os.environ["TABLE_NAME"])
    return _table


def put_session(session: Session) -> None:
    get_table().put_item(Item=session.to_item())


def get_sessions(user_id: str, limit: int = 100) -> list[Session]:
    resp = get_table().query(
        KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("SESSION#"),
        ScanIndexForward=False,
        Limit=limit,
    )
    return [Session.from_item(item) for item in resp.get("Items", [])]


def get_or_create_profile(user_id: str, email: str) -> UserProfile:
    table = get_table()
    resp = table.get_item(Key={"pk": f"USER#{user_id}", "sk": "PROFILE"})
    if "Item" in resp:
        item = resp["Item"]
        return UserProfile(user_id=item["user_id"], email=item["email"], created_at=int(item["created_at"]))
    profile = UserProfile(user_id=user_id, email=email)
    table.put_item(Item=profile.to_item())
    return profile
