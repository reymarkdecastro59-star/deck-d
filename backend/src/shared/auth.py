def get_user_id(event: dict) -> str:
    """Extract Cognito sub (user ID) from API Gateway authorizer claims."""
    return event["requestContext"]["authorizer"]["claims"]["sub"]


def get_user_email(event: dict) -> str:
    return event["requestContext"]["authorizer"]["claims"].get("email", "")
