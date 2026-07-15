import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
AUTH_CREDENTIALS = HTTPBasicAuth("admin", "admin123")
TIMEOUT = 30

def test_TC022_list_promos():
    url_login = f"{BASE_URL}/api/login"
    url_promos = f"{BASE_URL}/api/promos"

    session = requests.Session()

    try:
        # Authenticate to get session cookie
        login_payload = {"username": "admin", "password": "admin123"}
        login_resp = session.post(url_login, json=login_payload, timeout=TIMEOUT)
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"

        # Use session cookie automatically maintained by requests.Session
        response = session.get(url_promos, timeout=TIMEOUT)
        assert response.status_code == 200, f"Expected 200 OK, got {response.status_code}: {response.text}"

        data = response.json()
        # Validate that response contains "promos" key which is a list
        assert "promos" in data, "'promos' key not in response"
        assert isinstance(data["promos"], list), "'promos' is not a list"

    finally:
        # Logout to clean up session
        url_logout = f"{BASE_URL}/api/logout"
        try:
            logout_resp = session.post(url_logout, timeout=TIMEOUT)
            assert logout_resp.status_code == 200, f"Logout failed: {logout_resp.text}"
        except Exception:
            pass

test_TC022_list_promos()