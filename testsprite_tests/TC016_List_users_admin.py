import requests

BASE_URL = "http://localhost:80"
LOGIN_URL = f"{BASE_URL}/api/login"
USERS_URL = f"{BASE_URL}/api/users"
TIMEOUT = 30

def test_TC016_list_users_admin():
    session = requests.Session()
    try:
        # Login as admin
        login_resp = session.post(
            LOGIN_URL,
            json={"username": "admin", "password": "admin123"},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data
        assert "brands" in login_data
        assert "activeBrandId" in login_data

        # List users as admin
        users_resp = session.get(USERS_URL, timeout=TIMEOUT)
        assert users_resp.status_code == 200, f"Failed to get users list: {users_resp.text}"
        users_data = users_resp.json()
        assert isinstance(users_data, dict), "Response is not a JSON object"
        assert "users" in users_data, "Response missing 'users' key"
        assert isinstance(users_data["users"], list), "'users' is not a list"
    finally:
        session.close()

test_TC016_list_users_admin()