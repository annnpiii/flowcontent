import requests

BASE_URL = "http://localhost:80"
TIMEOUT = 30
AUTH = ("admin", "admin123")

def test_get_trends():
    session = requests.Session()
    try:
        # Login to get session cookie
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": AUTH[0], "password": AUTH[1]},
            timeout=TIMEOUT,
        )
        assert login_resp.status_code == 200, f"Login failed with status {login_resp.status_code}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Use session to call GET /api/trends
        trends_resp = session.get(f"{BASE_URL}/api/trends", timeout=TIMEOUT)
        assert trends_resp.status_code == 200, f"Get trends failed with status {trends_resp.status_code}"
        trends_data = trends_resp.json()
        assert isinstance(trends_data, dict), "Response should be a dictionary"
        assert "trends" in trends_data, "'trends' key missing in response"
        assert isinstance(trends_data["trends"], list), "'trends' should be a list"
    finally:
        # Logout to clean up session
        session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)

test_get_trends()