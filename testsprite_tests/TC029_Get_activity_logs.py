import requests
from requests.auth import HTTPBasicAuth

BASE_URL = "http://localhost:80"
USERNAME = "admin"
PASSWORD = "admin123"
TIMEOUT = 30

def test_tc029_get_activity_logs():
    session = requests.Session()
    try:
        # Authenticate and create session cookie via /api/login
        login_resp = session.post(
            f"{BASE_URL}/api/login",
            json={"username": USERNAME, "password": PASSWORD},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "user" in login_data and "brands" in login_data and "activeBrandId" in login_data

        # Use session cookies for authenticated request
        activities_resp = session.get(
            f"{BASE_URL}/api/activities",
            timeout=TIMEOUT
        )
        assert activities_resp.status_code == 200, f"Failed to get activity logs: {activities_resp.text}"
        activities_data = activities_resp.json()
        assert isinstance(activities_data, dict), "Response is not a JSON object"
        assert "logs" in activities_data, "'logs' key missing in response"
        assert isinstance(activities_data["logs"], list), "'logs' is not an array"

    finally:
        # Logout to clean up session
        session.post(f"{BASE_URL}/api/logout", timeout=TIMEOUT)

test_tc029_get_activity_logs()