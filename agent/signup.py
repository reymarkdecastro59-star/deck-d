import getpass
import boto3
from config import CLIENT_ID, USER_POOL_ID, REGION

if __name__ == "__main__":
    email = input("Email: ")
    password = getpass.getpass("Password (min 8 chars, 1 number): ")

    client = boto3.client("cognito-idp", region_name=REGION)
    try:
        client.sign_up(
            ClientId=CLIENT_ID,
            Username=email,
            Password=password,
            UserAttributes=[{"Name": "email", "Value": email}],
        )
        # Auto-confirm since this is your own account
        client.admin_confirm_sign_up(UserPoolId=USER_POOL_ID, Username=email)
        print("Account created and confirmed. Now run: login.py")
    except client.exceptions.UsernameExistsException:
        print("Account already exists. Run login.py")
    except Exception as e:
        print(f"Signup failed: {e}")
