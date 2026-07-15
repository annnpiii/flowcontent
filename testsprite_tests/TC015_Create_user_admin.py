import requests
from requests.auth import HTTPBasicAuth
import uuid

BASE_URL = "http://localhost:80"
LOGIN_ENDPOINT = f"{BASE_URL}/api/login"
USERS_ENDPOINT = f"{BASE_URL}/api/users"
LOGOUT_ENDPOINT = f"{BASE_URL}/api/logout"
TIMEOUT = 30

def test_TC015_create_user_admin():
    session = requests.Session()
    try:
        # Login as admin to get session cookie
        login_payload = {
            "username": "admin",
            "password": "admin123"
        }
        login_resp = session.post(
            LOGIN_ENDPOINT,
            json=login_payload,
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

        # Prepare unique username to prevent conflict
        unique_username = f"testuser_{uuid.uuid4().hex[:8]}"
        user_payload = {
            "username": unique_username,
            "password": "TestPass123!",
            "display_name": "Test User",
            "role": "creator"
        }

        # Create user as admin
        create_resp = session.post(
            USERS_ENDPOINT,
            json=user_payload,
            timeout=TIMEOUT
        )
        assert create_resp.status_code == 200, f"User creation failed: {create_resp.text}"
        json_create = create_resp.json()
        assert "ok" in json_create and json_create["ok"] is True, f"Unexpected response body: {create_resp.text}"

        # Optionally check that the user is retrievable in user list
        list_resp = session.get(USERS_ENDPOINT, timeout=TIMEOUT)
        assert list_resp.status_code == 200, f"Listing users failed: {list_resp.text}"
        users = list_resp.json().get("users", [])
        assert any(u.get("username") == unique_username for u in users), "Created user not found in users list"

    finally:
        # Cleanup: delete the created user to avoid clutter
        # First get user id by listing users
        try:
            list_resp = session.get(USERS_ENDPOINT, timeout=TIMEOUT)
            if list_resp.status_code == 200:
                users = list_resp.json().get("users", [])
                user_to_delete = next((u for u in users if u.get("username") == unique_username), None)
                if user_to_delete and "id" in user_to_delete:
                    del_resp = session.delete(f"{USERS_ENDPOINT}/{user_to_delete['id']}", timeout=TIMEOUT)
                    assert del_resp.status_code == 200, f"User deletion failed: {del_resp.text}"
        except Exception:
            pass

        # Logout admin session
        try:
            session.post(LOGOUT_ENDPOINT, timeout=TIMEOUT)
        except Exception:
            pass

test_TC015_create_user_admin()