import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30


def test_tc007_list_contents():
    session = requests.Session()
    try:
        # Authenticate first to obtain session cookies for authenticated requests
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data
        assert "brands" in login_data
        assert "activeBrandId" in login_data

        # Use session cookie to get contents list
        contents_resp = session.get(
            f"{BASE_URL}/api/contents",
            timeout=TIMEOUT
        )
        assert contents_resp.status_code == 200, f"Failed to list contents: {contents_resp.text}"
        contents_data = contents_resp.json()
        assert "contents" in contents_data, "Response JSON missing 'contents' key"
        assert isinstance(contents_data["contents"], list), "'contents' should be a list"

    finally:
        # Logout to destroy session
        try:
            logout_resp = session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)
            assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
            logout_data = logout_resp.json()
            assert logout_data.get("ok") is True
        except Exception:
            pass


test_tc007_list_contents()