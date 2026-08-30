import getpass
from auth import login

if __name__ == "__main__":
    email = input("Email: ")
    password = getpass.getpass("Password: ")
    try:
        login(email, password)
        print("Logged in successfully. You can now run main.py")
    except Exception as e:
        print(f"Login failed: {e}")
