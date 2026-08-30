import os
from typing import Optional
import boto3
from boto3.dynamodb.conditions import Key, Attr
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


def _find_session_item(user_id: str, session_id: str) -> Optional[dict]:
    """Query by pk + sk prefix, filter by session_id to get the full item."""
    resp = get_table().query(
        KeyConditionExpression=Key("pk").eq(f"USER#{user_id}") & Key("sk").begins_with("SESSION#"),
        FilterExpression=Attr("session_id").eq(session_id),
    )
    items = resp.get("Items", [])
    return items[0] if items else None


def delete_session(user_id: str, session_id: str) -> bool:
    item = _find_session_item(user_id, session_id)
    if item is None:
        return False
    get_table().delete_item(Key={"pk": item["pk"], "sk": item["sk"]})
    return True


def update_session_label(user_id: str, session_id: str, label: str) -> Optional[Session]:
    item = _find_session_item(user_id, session_id)
    if item is None:
        return None
    resp = get_table().update_item(
        Key={"pk": item["pk"], "sk": item["sk"]},
        UpdateExpression="SET #lbl = :l",
        ExpressionAttributeNames={"#lbl": "label"},
        ExpressionAttributeValues={":l": label},
        ReturnValues="ALL_NEW",
    )
    return Session.from_item(resp["Attributes"])


def get_or_create_profile(user_id: str, email: str) -> UserProfile:
    table = get_table()
    resp = table.get_item(Key={"pk": f"USER#{user_id}", "sk": "PROFILE"})
    if "Item" in resp:
        item = resp["Item"]
        return UserProfile(user_id=item["user_id"], email=item["email"], created_at=int(item["created_at"]))
    profile = UserProfile(user_id=user_id, email=email)
    table.put_item(Item=profile.to_item())
    return profile


def get_profile(user_id: str) -> Optional[UserProfile]:
    resp = get_table().get_item(Key={"pk": f"USER#{user_id}", "sk": "PROFILE"})
    if "Item" not in resp:
        return None
    item = resp["Item"]
    return UserProfile(user_id=item["user_id"], email=item["email"], created_at=int(item["created_at"]))


def update_profile(user_id: str, **fields) -> Optional[UserProfile]:
    existing = get_profile(user_id)
    if existing is None:
        return None
    allowed = {"email"}
    updates = {k: v for k, v in fields.items() if k in allowed}
    if not updates:
        return existing
    set_expr = ", ".join(f"#f_{k} = :{k}" for k in updates)
    attr_names = {f"#f_{k}": k for k in updates}
    attr_values = {f":{k}": v for k, v in updates.items()}
    resp = get_table().update_item(
        Key={"pk": f"USER#{user_id}", "sk": "PROFILE"},
        UpdateExpression=f"SET {set_expr}",
        ExpressionAttributeNames=attr_names,
        ExpressionAttributeValues=attr_values,
        ReturnValues="ALL_NEW",
    )
    item = resp["Attributes"]
    return UserProfile(user_id=item["user_id"], email=item["email"], created_at=int(item["created_at"]))
